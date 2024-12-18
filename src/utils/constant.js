import * as Msal from 'msal/dist/msal';
//On-Prem - http://localhost:81
//Cloud - https://stc-purchase-order-api.azurewebsites.net

//Office-on Prem https://192.168.0.21/

export const SERVER = process.env.NODE_ENV === "development" ? 'https://localhost:5101' : "https://stc-purchase-order-api.azurewebsites.net"; 

//https://192.168.0.222:3001
// Self host
// https://localhost:5101

// IIS
// https://localhost:44352

//On-Prem
// redirectUri: process.env.NODE_ENV === "development" ? 'http://localhost:3000/' : 'https://192.168.0.222/',

// Cloud
// redirectUri: process.env.NODE_ENV === "development" ? 'http://localhost:3000/' : 'https://stc-purchase-order.azurewebsites.net/',

//Backup On prem https://192.168.0.116/
var msalConfig = {
    auth: {
        clientId: "d40ea55c-88f4-45cd-af0e-8ed3c2f70708",
        authority: "https://login.microsoftonline.com/5b832654-1eb0-4bfa-a1db-513bd6be5314",
        redirectUri: process.env.NODE_ENV === "development" ? 'http://localhost:3000/' : 'https://stc-purchase-order.azurewebsites.net/',
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: true
    }
  };
  
export const myMSALObj = new Msal.UserAgentApplication(msalConfig);

//Dev https://localhost:5101
//Prod http://192.168.0.222:3000
export const CLOUD_SERVER = `https://stc-api.azurewebsites.net`; 
export const APPROVER_SERVER = process.env.NODE_ENV === "development" ? 'https://localhost:5101' :  `https://stc-purchase-order-api.azurewebsites.net`; 


export const POStatus = [
    "Pending",
    "Approved",
    "Rejected",
    "Draft",
    "Received",
    "For Cancellation",
    "Cancelled",
    "Cancellation Rejected"
];

export const PO_PENDING_VIEWS = {
    LIST: 1,
    ITEM: 2,
    EDIT: 3
};
export const MENU_ID = {
    NewPO: 1,
    PendingPO: 2,
    Approver: 100,
    Supplier: 110,
};

export const AMOUNT_LOGICAL_OPERATORS = [
    "Less than",
    "No Limit",
];

export const CURRENCY = [
    {id: 1, symbol: '₱', code: 'PHP'},
    {id: 2, symbol: '$', code: 'USD'},
    {id: 3, symbol: '€', code: 'EUR'},
];

//in MB
export const UPLOAD_MAX_FILE_SIZES_MB = 5;

export const ACCESS_RIGHTS = {
    NONE: 0,
    READ: 1,
    MODIFY: 2,
    RECEIVER: 3
};

//18 is equal to 1 line
export const REMARKS_MAX_LINE = 18 * 35;

//PO item max quantity
export const MAX_QTY = 1000000;
