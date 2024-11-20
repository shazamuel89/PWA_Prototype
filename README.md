Budget Tracker
Author: Samuel Heinrich

Overview:
The Budget Tracker is a Progressive Web App that is designed to help users record and view their income and expenses.
This application allows users to track their financial transactions, providing a clear overview of their financial situation.

Features:
Add Transactions: Users can input their income and expenses, categorizing each transaction in a way that works best for them.
View Recent Transactions: The app displays a list of recent transactions, allowing users to quickly review their financial history.
Visual Indicators: The application features visual elements like a balance overview card and a progress bar to represent financial data effectively.

To view the Budget Tracker prototype, follow these steps:
Clone the github repository using this line of code in git: "git clone https://github.com/shazamuel89/PWA_Prototype.git"
Open the project in Visual Studio Code.
Using the extension live server, click "Open With Live Server" at the bottom right of the window.
The webpage should open in a new tab in your default browser!

The service worker uses the cache to save the files used in the Budget Tracker. This includes the html, css and js files, as well as images for the app, screenshot
images for shortcuts, and select icon images that are smaller in size to avoid taking up too much space in the cache.

The manifest file allows the user to download the PWA to be like a local app on their device. It includes the colors and overall look of the PWA, and it also includes
icons of various sizes and screenshots of adding income and adding expenses for the shortcuts.

I have added support for Firebase and IndexedDB, which allow the transactions a user adds to be saved even after the user leaves the page.
The transactions are saved to IndexedDB, which is stored on the user's computer, so it can be accessed offline.
The transactions are also synced to a Firebase database, which is online. This means that they are backed up in an online database.
If the user adds or edits transactions offline, then the transactions are added to the IndexedDB, then synced with Firebase whenever the user gets back online.
The user can also edit transactions that have already been added by clicking the edit icon on the transaction, then updating the information that is prefilled in the form above,
then clicking "Edit Transaction". The edits will appear immediately and will be synced with both databases offline and online.