// ==UserScript==
// @name        NeoTransactionExporter
// @namespace   Violentmonkey Scripts
// @match       https://member.neofinancial.com/accounts/*/transactions
// @grant       none
// @version     1.0
// @license     MIT
// @description Enhances Neo Financial's CSV export by fixing refunds, filtering transactions, and tracking removals.
// ==/UserScript==


const exportCsvId = "export-transactions-csv";
console.log("[DEBUG] NeoFinancial Export Script Loaded!");

// Mutation Observer to check for page changes
const observer = new MutationObserver(() => {
   if (isTransactionsPage()) keepButtonShown();
   else document.getElementById(exportCsvId)?.remove();
});
observer.observe(document.documentElement, {
   childList: true,
   subtree: true
});

window.addEventListener("load", keepButtonShown);

function isTransactionsPage() {
   return window.location.pathname.match(/^\/accounts\/(credit|savings)\/[^/]+\/transactions$/);
}

function getAccountInfo() {
   const pathParts = window.location.pathname.split("/");
   return pathParts.length >= 5 ? {
      type: pathParts[2],
      id: pathParts[3]
   } : null;
}

async function keepButtonShown() {
   if (document.getElementById(exportCsvId) || !isTransactionsPage()) return;
   const accountInfo = getAccountInfo();
   if (!accountInfo) return;
   addDownloadButtons(accountInfo);
}

function addDownloadButtons(accountInfo) {
   if (!accountInfo || document.getElementById(exportCsvId)) return;
   document.body.insertAdjacentHTML('beforeend', `
        <div id="${exportCsvId}" style="position: fixed; bottom: 10px; left: 10px; z-index: 1000; background-color: rgba(255, 255, 255, 0.9); padding: 10px; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);">
            <div style="font-weight: bold;">Export as CSV:</div>
            <button id="export-csv-last-year">Last Year (Full 2024)</button>
        </div>
    `);
   document.getElementById("export-csv-last-year").addEventListener("click", () => fetchTransactions(accountInfo));
}

async function fetchTransactions(accountInfo) {
   console.log("[DEBUG] Fetching transactions...");
   let transactions = await creditTransactions(accountInfo.id);
   console.log(`[DEBUG] Total transactions fetched: ${transactions.length}`);

   let filteredTransactions = transactions.filter(tx =>
      tx.authorizationProcessedAt.startsWith("2024") &&
      tx.status !== "DECLINED" && // ✅ Remove declined transactions properly
      !["PAYMENT", "REWARDS_ACCOUNT_CASH_OUT", "INTEREST_EARNED", "DISPUTE_COMPLETED", "DISPUTE_IN_PROGRESS", "IN_PROGRESS"].includes(tx.category)
   );

   console.log(`[DEBUG] Transactions after filtering: ${filteredTransactions.length}`);

   let finalTransactions = matchRefunds(filteredTransactions);
   console.log(`[DEBUG] Transactions after refund matching: ${finalTransactions.length}`);

   let blob = transactionsToCsvBlob(finalTransactions);
   let blobUrl = URL.createObjectURL(blob);
   let nowStr = new Date().toISOString().split("T")[0];
   let link = document.createElement("a");
   link.href = blobUrl;
   link.download = `Neo_Transactions_2024_Filtered_${nowStr}.csv`;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(blobUrl);
   console.log("[DEBUG] CSV export completed.");
}

// ✅ **Final Refund Matching**
function matchRefunds(transactions) {
   let purchases = transactions.filter(tx => tx.category === "PURCHASE");
   let refunds = transactions.filter(tx => tx.category === "REFUND");

   let finalTransactions = [...purchases];
   let remainingRefunds = [];
   let removedTransactions = []; // ✅ Track removed transactions

   refunds.forEach(refund => {
      let match = null;
      let refundName = normalizeMerchantName(refund.description);
      let refundDate = new Date(refund.authorizationProcessedAt);

      console.log(`[DEBUG] Processing refund: ${refund.description} (${refund.amountCents / 100})`);

      const timeTiers = [1, 2, 7, 15, 30, 45];

      // ✅ **Prevent Large Refund Mismatches**
      const pastPurchasesForMerchant = purchases.filter(p => normalizeMerchantName(p.description) === refundName);
      if (pastPurchasesForMerchant.length > 0) {
         const avgPurchaseAmount = pastPurchasesForMerchant.reduce((sum, p) => sum + p.amountCents, 0) / pastPurchasesForMerchant.length;
         const maxPurchaseAmount = Math.max(...pastPurchasesForMerchant.map(p => p.amountCents), 0);

         const THRESHOLD_MULTIPLIER = 2.5; // Adjust multiplier as needed

         if (refund.amountCents > THRESHOLD_MULTIPLIER * maxPurchaseAmount) {
            console.log(`[DEBUG] Refund "${refund.description}" (${refund.amountCents / 100}) is too large relative to past purchases. Skipping match.`);
            removedTransactions.push({
               ...refund,
               reason: "Refund too large compared to past purchases"
            }); // ✅ Log removed transaction
            remainingRefunds.push(refund);
            return; // Skip this refund
         }
      }

      for (let days of timeTiers) {
         if (match) break;

         // ✅ **Exact Match on Amount + Normalized Name**
         match = purchases.find(purchase => {
            let purchaseDate = new Date(purchase.authorizationProcessedAt);
            return purchase.amountCents === refund.amountCents &&
               normalizeMerchantName(purchase.description) === refundName &&
               purchaseDate < refundDate &&
               (refundDate - purchaseDate) <= days * 86400000;
         });

         // ✅ **Other Matching Logic (Levenshtein, Jaccard, Partial Refunds, etc.)**
         if (!match) {
            match = purchases.find(purchase => {
               let purchaseDate = new Date(purchase.authorizationProcessedAt);
               let percentageDiff = refund.amountCents / purchase.amountCents;
               return percentageDiff > 0 &&
                  jaccardSimilarity(normalizeMerchantName(purchase.description), refundName) >= 0.75 &&
                  purchaseDate < refundDate &&
                  (refundDate - purchaseDate) <= days * 86400000;
            });
         }
      }

      if (match) {
         console.log(`[DEBUG] Matched refund "${refund.description}" to purchase "${match.description}" (Date: ${match.authorizationProcessedAt}, Amount: ${match.amountCents / 100})`);

         // ✅ **REMOVE BOTH if refund is equal to or greater than purchase**
         if (refund.amountCents >= match.amountCents) {
            console.log(`[DEBUG] Removing both refund and purchase: ${refund.description}`);
            removedTransactions.push({
               ...refund,
               reason: "Full refund match"
            }); // ✅ Log refund removal
            removedTransactions.push({
               ...match,
               reason: "Fully refunded purchase"
            }); // ✅ Log purchase removal
            finalTransactions = finalTransactions.filter(tx => tx !== match && tx !== refund);
         } else {
            match.amountCents -= refund.amountCents;
            removedTransactions.push({
               ...refund,
               reason: "Partial refund applied"
            }); // ✅ Log partial refund

            // ✅ Remove purchase if it is fully refunded
            if (match.amountCents === 0) {
               removedTransactions.push({
                  ...match,
                  reason: "Fully refunded purchase after adjustment"
               }); // ✅ Log full refund match
               finalTransactions = finalTransactions.filter(tx => tx !== match);
            }
         }
      } else {
         remainingRefunds.push(refund);
         console.log(`[DEBUG] Refund not matched: ${refund.description} (${refund.amountCents / 100})`);
      }
   });

   finalTransactions.push(...remainingRefunds);

   // ✅ Export removed transactions separately
   exportRemovedTransactionsCsv(removedTransactions);

   return finalTransactions;
}

function normalizeMerchantName(name) {
   return name.replace(/#\d+/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

// ✅ **Levenshtein Distance Algorithm**
function levenshteinDistance(a, b) {
   if (a === b) return 0;
   let matrix = Array.from({
      length: b.length + 1
   }, (_, i) => [i]);
   matrix[0] = Array.from({
      length: a.length + 1
   }, (_, i) => i);

   for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
         matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1),
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1
         );
      }
   }

   return matrix[b.length][a.length];
}

// ✅ **Jaccard Similarity for Overlapping Words**
function jaccardSimilarity(str1, str2) {
   let set1 = new Set(str1.split(" "));
   let set2 = new Set(str2.split(" "));
   return new Set([...set1].filter(x => set2.has(x))).size / new Set([...set1, ...set2]).size;
}

// ✅ **Corrected API Fetch for Transactions**
async function creditTransactions(accountId) {
   console.log(`[DEBUG] Fetching credit transactions for account: ${accountId}`);
   let transactions = [];
   let hasNextPage = true;
   let cursor = null;

   while (hasNextPage) {
      let response = await fetch("https://api.production.neofinancial.com/graphql", {
         method: "POST",
         credentials: "include",
         headers: {
            "Content-Type": "application/json"
         },
         body: JSON.stringify({
            operationName: "TransactionsList",
            query: `query TransactionsList($input: CursorQueryInput!, $creditAccountId: ObjectID!) {
                    user { creditAccount(id: $creditAccountId) {
                        creditTransactionList(input: $input) { cursor hasNextPage results {
                            description category amountCents authorizationProcessedAt status
                        }}}}}`,
            variables: {
               creditAccountId: accountId,
               input: {
                  cursor,
                  limit: 1000,
                  sort: {
                     direction: "DESC",
                     field: "authorizationProcessedAt"
                  }
               }
            }
         }),
      });

      let resp = await response.json();
      let transactionList = resp.data?.user?.creditAccount?.creditTransactionList;
      hasNextPage = transactionList?.hasNextPage ?? false;
      cursor = transactionList?.cursor;
      transactions = transactions.concat(transactionList?.results ?? []);
   }

   console.log(`[DEBUG] Successfully fetched ${transactions.length} transactions.`);
   return transactions;
}


function transactionsToCsvBlob(transactions) {
   console.log("[DEBUG] Converting transactions to CSV...");

   let csv = `"Date","Description","Category","Debit","Credit","Status"\n`;

   transactions.forEach(transaction => {
      let dateStr = transaction.authorizationProcessedAt.split("T")[0];
      let credit = transaction.amountCents > 0 ? (transaction.amountCents / 100).toFixed(2) : ""; // ✅ Refunds/Money in
      let debit = transaction.amountCents < 0 ? ((-transaction.amountCents) / 100).toFixed(2) : ""; // ✅ Purchases/Money out

      csv += `"${dateStr}","${transaction.description}","${transaction.category}","${debit}","${credit}","${transaction.status}"\n`;
   });

   return new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8"
   });
}

function exportRemovedTransactionsCsv(removedTransactions) {
   if (removedTransactions.length === 0) {
      console.log("[DEBUG] No transactions were removed.");
      return;
   }

   console.log(`[DEBUG] Exporting ${removedTransactions.length} removed transactions...`);

   let csv = `"Date","Description","Category","Amount","Status","Reason for Removal"\n`;

   removedTransactions.forEach(transaction => {
      let dateStr = transaction.authorizationProcessedAt.split("T")[0];
      let amount = (transaction.amountCents / 100).toFixed(2);
      csv += `"${dateStr}","${transaction.description}","${transaction.category}","${amount}","${transaction.status}","${transaction.reason}"\n`;
   });

   let blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8"
   });
   let blobUrl = URL.createObjectURL(blob);
   let nowStr = new Date().toISOString().split("T")[0];

   let link = document.createElement("a");
   link.href = blobUrl;
   link.download = `Removed_Transactions_${nowStr}.csv`;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(blobUrl);

   console.log("[DEBUG] Removed transactions CSV export completed.");
}
