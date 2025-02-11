# **📌 NeoTransactionExporter - Accurate CSV Export for Neo Financial**

🚀 **A Tampermonkey script that enhances Neo Financial’s CSV export by fixing refund matching, filtering unwanted transactions, and tracking removed transactions.**

---

## **📥 Installation (Tampermonkey)**

### **1. Install Tampermonkey**

Tampermonkey is required to run this script. Install it using the appropriate link for your browser:

- [Chrome Extension](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Safari Version](https://apps.apple.com/us/app/tampermonkey/id1482490089)

### **2. Install the Script**

1. Click this link to install the script:
   👉 [NeoTransactionExporter.user.js](https://raw.githubusercontent.com/sirajahmadzai/UltimateNeoFinancialExporter/main/UltimateNeoFinancialExporter.user.js)
2. Tampermonkey will open and prompt you to **install the script**.
3. Click **"Install"**.
4. Ensure the script is **enabled** in Tampermonkey.

### **3. Run the Script**

1. Go to the **Neo Financial Website, login and navigate to the transactions Page**:
   - Open: [Neo Financial](https://member.neofinancial.com/)
2. The **"Export Transactions as CSV"** button should appear on the page.
3. Click the button to download the filtered transactions.

### **4. Download the CSV Files**

- **Neo_Transactions_2024_Filtered.csv** → Contains cleaned-up transactions.
- **Removed_Transactions.csv** → Logs transactions that were removed for verification.

---

## **⚡ Features & Fixes**

✔ **Tampermonkey support added!**
✔ **Correct Refund Matching** → Refunds now match the correct purchases.
✔ **Prevents Incorrect Refund Removal** → Stops large refunds from being matched to small transactions.
✔ **Excludes Unwanted Transactions** → Filters out **payments, rewards cash-outs, interest, and disputes**.
✔ **Corrects Debit/Credit Columns** → Purchases (money out) are in **Credit**, refunds (money in) are in **Debit**.
✔ **Tracks Removed Transactions** → Exports a second CSV file to verify all removals.
✔ **Fixes CSV Export Issues** → Transactions now export properly with correct formatting.

---

## **🛠 Troubleshooting**

### 🔹 The export button is missing in Tampermonkey
- **Solution 1:** Manually trigger it by opening the developer console (`F12` → Console) and running:
  ```js
  keepButtonShown();
  ```
- **Solution 2:** Ensure the script is **enabled** in Tampermonkey.
- **Solution 3:** Try reinstalling Tampermonkey and the script.

### 🔹 CSV files don’t download?
- Make sure **pop-ups and downloads** are allowed in your browser settings.
- If necessary, manually trigger:
  ```js
  fetchTransactions(getAccountInfo());
  ```

---

## **📜 License**

This project is licensed under the **MIT License**.  
Feel free to modify and share!

---

## **💡 Credits**

- The **original script** was sourced from:  
  👉 **[NeoFinancial Export Transactions as CSV (GreasyFork)](https://greasyfork.org/en/scripts/497956-neofinancial-export-transactions-as-csv)**  
- This version significantly improves it by:
  - **Adding Tampermonkey support**
  - **Better refund handling**
  - **Cleaner CSV export**
  - **Debugging and tracking removed transactions**
- Developed and improved based on real transaction testing.

---

### **🔗 Links**

- **GitHub Repository**: [NeoTransactionExporter](https://github.com/sirajahmadzai/UltimateNeoFinancialExporter)
- **Neo Financial Website**: [Click Here](https://member.neofinancial.com/)

---

💪 **Now fully functional with Tampermonkey! Enjoy seamless transaction exports from Neo Financial.** 🚀

