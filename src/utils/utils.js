import * as moment from 'moment';
import {ACCESS_RIGHTS} from './constant';
import numeral from 'numeral';

export const addLeadingZeroIfOneDigit = (value) => {
    let tmp = String(value);
    if (tmp.length == 1) {
        return "0"+tmp;
    }
    return value;
}

export const getLinesCountOfItemsAndRemarks = (remarksRef) => {
    let totalLinesStringArray = "";
    for (let index = 0; index < document.getElementsByClassName("textarea").length-1; index++) {
        //31 is the height of textarea when dont have any text
        //18px is added to the height of textare every new line
        //+1 is for offset
        let lineCount = parseInt((document.getElementsByClassName("textarea")[index].clientHeight-31)/18);

        //empty description count 1 line
        if (lineCount == 0) {
            lineCount = 1;
        }

        totalLinesStringArray += String((lineCount ) + 1);
        totalLinesStringArray += ","; 
    }

    totalLinesStringArray += String(parseInt((remarksRef.current.clientHeight-31)/18));
    return totalLinesStringArray;
}

export const getApproversThatMeetRequirements = (approvers, orderTotal, code)  => {
    let tmpApprover = [];

    approvers.forEach(a => {

        switch(code) {
            case 'PHP':
                switch(a.amountLogicalOperatorPHP) {
                    case "Less than":
                        if (a.amountPHP > orderTotal) {
                            tmpApprover.push(a);
                        }
                        break;
                    case "No Limit":
                        tmpApprover.push(a);
                        break;
                }
                break;
            case 'USD':
                switch(a.amountLogicalOperatorUSD) {
                    case "Less than":
                        if (a.amountUSD > orderTotal) {
                            tmpApprover.push(a);
                        }
                        break;
                    case "No Limit":
                        tmpApprover.push(a);
                        break;
                }
                break;
            case 'EUR':
                switch(a.amountLogicalOperatorEUR) {
                    case "Less than":
                        if (a.amountEUR > orderTotal) {
                            tmpApprover.push(a);
                        }
                        break;
                    case "No Limit":
                        tmpApprover.push(a);
                        break;
                }
                break;
        }
    });

    return tmpApprover;
}

export const jsDateToSqlDate = (jsDate) => {
    return jsDate == null ? "" : jsDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((jsDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(jsDate.getDate());
}

export const getUserAccess = (o365Groups, allowedGroups) => {
    if (process.env.NODE_ENV === "development") {
        return ACCESS_RIGHTS.MODIFY;
    }

    let currentUserRights = ACCESS_RIGHTS.NONE;

    //the order of checking should Read, Receiver and Modify
    //so that it will override the lower permission with higner permission


    //loop to the office 365 group to find if user is below to any allowed groups
    for (let index = 0; index < o365Groups.value.length; index++) {
        let mail = o365Groups.value[index].mail;

        //check if user has read access
        if (allowedGroups.readPermissions.filter(r => r == mail).length == 1) {
            currentUserRights = ACCESS_RIGHTS.READ;
        }

    }

    //loop to the office 365 group to find if user is below to any allowed groups
    for (let index = 0; index < o365Groups.value.length; index++) {
        let mail = o365Groups.value[index].mail;

        //check if user has receive access
        if (allowedGroups.receiverPermissions.filter(r => r == mail).length == 1) {
            currentUserRights = ACCESS_RIGHTS.RECEIVER;
        }

    }

    //loop to the office 365 group to find if user is below to any allowed groups
    for (let index = 0; index < o365Groups.value.length; index++) {
        let mail = o365Groups.value[index].mail;

        //check if user has modify access
        if (allowedGroups.modifyPermissions.filter(r => r == mail).length == 1) {
            currentUserRights = ACCESS_RIGHTS.MODIFY;
        }
    }

    return currentUserRights;
}

export const convertApproverNameToInitials = (approverName, approvers) => {

    let intials = approverName;

    approvers.forEach(a => {
        let name = `${a.firstName.toLocaleUpperCase()} ${a.lastName.toLocaleUpperCase()}`;

        if (name == approverName.toLocaleUpperCase()) {
            intials = `${a.firstName.toLocaleUpperCase().charAt(0)}.${a.lastName.toLocaleUpperCase().charAt(0)}.`;
        }
    });


    return intials;
}

export const getContactPersonFirstName = (contactPersonId, supplierId, suppliers) => {

    let firstName = "";

    let supplier = suppliers.filter(s => s.id == supplierId)[0];
    let contactPerson = supplier.contactPersons.filter(c => c.id == contactPersonId)[0];

    firstName = contactPerson.firstName;

    return firstName;

}

export const getPOHTMLFormat = (po) => {

    let html = '';

    html += `
        <table style='border-collapse: collapse; width: 100%; height: 88px;' border='0'>
        <tbody>
        <tr style='height: 22px;'>
            <td style='width: 16.7055%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Supplier</strong></span></td>
            <td style='width: 44.5095%; height: 22px;'>${po.supplierName == null ? '' : po.supplierName}</td>
            <td style='width: 20.4439%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>PO No.</strong></span></td>
            <td style='width: 18.3411%; height: 22px;'>${po.orderNumber}</td>
        </tr>
        `;


    html += `
        <tr style='height: 22px;'>
            <td style='width: 16.7055%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Address</strong></span></td>
            <td style='width: 44.5095%; height: 22px; vertical-align: top;' rowspan='2'>${po.supplierAddress == null ? '' : po.supplierAddress}</td>
            <td style='width: 20.4439%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Ref No.</strong></span></td>
            <td style='width: 18.3411%; height: 22px;'>${po.referenceNumber == null ? '' : po.referenceNumber}</td>
        </tr>
    `;


    html += `
        <tr style='height: 22px;'>
            <td style='width: 16.7055%; height: 22px;'></td>
            <td style='width: 20.4439%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Date</strong></span></td>
            <td style='width: 18.3411%; height: 22px;'>${po.approvedOn == null ? '' : moment.parseZone(po.approvedOn).format('MM/DD/YYYY')}</td>
        </tr>
    `;

    html += `
        <tr style='height: 22px;'>
            <td style='width: 16.7055%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Contact Person</strong></span></td>
            <td style='width: 44.5095%; height: 22px;'>${po.contactPersonName == null ? '' : po.contactPersonName}</td>
            <td style='width: 20.4439%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>ETA</strong></span></td>
            <td style='width: 18.3411%; height: 22px;'>${po.estimatedArrival == null ? '' : moment.parseZone(po.estimatedArrival).format('MM/DD/YYYY')}</td>
        </tr>
    `;

    html += `
        <tr style='height: 22px;'>
            <td style='width: 16.7055%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Customer</strong></span></td>
            <td style='width: 44.5095%; height: 22px;'>${po.customerName == null ? '' : po.customerName}</td>
            <td style='width: 20.4439%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Currency</strong></span></td>
            <td style='width: 18.3411%; height: 22px;'>${po.currency}</td>
        </tr>
    `;

    let terms = "";
    if (String(po.termsOfPayment).toUpperCase() == "COD") {
        terms = `${po.termsOfPayment}`;
    } else if (po.termsOfPayment != "" && po.termsOfPayment != null && po.termsOfPayment != "null") {
        terms = `${po.termsOfPayment} days`;
    }

    html += `
    <tr style='height: 22px;'>
        <td style='width: 16.7055%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>S.I# or B.I#</strong></span></td>
        <td style='width: 44.5095%; height: 22px;'>${po.siOrBI == null ? '' : po.siOrBI}</td>
        <td style='width: 20.4439%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Terms</strong></span></td>
        <td style='width: 18.3411%; height: 22px;'>${terms}</td>
    </tr>
    `;

    html += `
    <tr style='height: 22px;'>
        <td style='width: 16.7055%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Invoice Date</strong></span></td>
        <td style='width: 18.3411%; height: 22px;'>${po.invoiceDate == null ? '' : moment.parseZone(po.invoiceDate).format('MM/DD/YYYY')}</td>
        <td style='width: 20.4439%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'></span></td>
        <td style='width: 18.3411%; height: 22px;'></td>
    </tr>
    `;

    html += `
        </tbody>
        </table>
    `;

    html += `
        <br/><table style='border-collapse: collapse; width: 100%; height: 110px;' border='0'>
                <tbody>
                <tr style='height: 22px;'>
                <td style='width: 8.55188%; text-align: center; height: 22px;background-color: #ced4d9;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Quantity</strong></span></td>
                <td style='width: 56.3469%; height: 22px;background-color: #ced4d9;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Description</strong></span></td>
                <td style='width: 17.0143%; height: 22px; text-align: right;background-color: #ced4d9;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Unit Price</strong></span></td>
                <td style='width: 18.087%; height: 22px; text-align: right;background-color: #ced4d9;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Amount</strong></span></td>
                </tr>
    `;

    let tmpTotal = po.poPendingItems.reduce((total, item) => { return total + (item.quantity * item.price) }, 0);
    
    po.poPendingItems.forEach(i => {

        let description = i.name.replace(/(?:\r\n|\r|\n)/g, '<br>');

        html += `
        <tr style='height: 22px;'>
            <td style='width: 8.55188%; text-align: center; height: 22px;border-bottom: 1px solid black;'>${numeral(Number(i.quantity)).format('0,0') }</td>
            <td style='width: 56.3469%; height: 22px;border-bottom: 1px solid black;'>${description}</td>
            <td style='width: 17.0143%; height: 22px; text-align: right;border-bottom: 1px solid black;'>${numeral(Number( i.price )).format('0,0.00')}</td>
            <td style='width: 18.087%; height: 22px; text-align: right;border-bottom: 1px solid black;'><strong>${numeral(Number( i.quantity * i.price )).format('0,0.00')}</strong></td>
        </tr>
        `;

    });

    html += `
    <tr style='height: 22px;'>
        <td style='width: 8.55188%; text-align: center; height: 22px;'>&nbsp;</td>
        <td style='width: 56.3469%; height: 22px;'>&nbsp;</td>
        <td style='width: 17.0143%; height: 22px; text-align: right;'>&nbsp;</td>
        <td style='width: 18.087%; height: 22px; text-align: right;'><strong>${numeral(Number(tmpTotal )).format('0,0.00')}</strong></td>
    </tr>
    `;

    html += `

    <tr style='height: 22px;'>
        <td style='width: 8.55188%; text-align: center; height: 22px;'>&nbsp;</td>
        <td style='width: 56.3469%; height: 22px; text-align: right;'></td>
        <td style='width: 17.0143%; height: 22px; text-align: right;'><span style='font-family: arial, helvetica, sans-serif;'>Discount ${po.discount}%</span></td>
        <td style='width: 18.087%; height: 22px; text-align: right;'><strong>${tmpTotal == 0 ?
            `0`
            :
            `-${numeral((po.discount/100)*tmpTotal).format('0,0.00')}`}</strong></td>
    </tr>
    `;


    html += `
    
    <tr style='height: 22px;'>
    <td style='width: 8.55188%; text-align: center; height: 22px;'>&nbsp;</td>
    <td style='width: 56.3469%; height: 22px;'>&nbsp;</td>
    <td style='width: 17.0143%; height: 22px; text-align: right;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Total Amount</strong></span></td>
    <td style='width: 18.087%; height: 22px; text-align: right;border-top: 1px solid black;'><strong>${
            tmpTotal == 0 ?
            `0`
            :
            `${po.currency}${numeral(po.total).format('0,0.00')}`
    }</strong></td>
    </tr>
    </tbody>
    </table>

    `;


    let remarks = po.remarks == null ? '' : po.remarks.replace(/(?:\r\n|\r|\n)/g, '<br>');
    let internalNote = po.internalNote == null ? '' : po.internalNote.replace(/(?:\r\n|\r|\n)/g, '<br>');
    

    html += `
    
    <table style='border-collapse: collapse; width: 100%; height: 132px;' border='0'>
        <tbody>
        <tr style='height: 22px;'>
        <td style='width: 100%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Remarks</strong></span></td>
        </tr>
        <tr style='height: 22px;'>
        <td style='width: 100%; height: 22px;'>${po.remarks == null ? '' : remarks}</td>
        </tr>
        <tr style='height: 22px;'>
        <td style='width: 100%; height: 22px;'>&nbsp;</td>
        </tr>
        <tr style='height: 22px;'>
        <td style='width: 100%; height: 22px;'><span style='font-family: arial, helvetica, sans-serif;'><strong>Internal note</strong></span></td>
        </tr>
        <tr style='height: 22px;'>
        <td style='width: 100%; height: 22px;'>${po.internalNote == null ? '' : internalNote}</td>
        </tr>
        <tr style='height: 22px;'>
        <td></td>
        </tr>
        </tbody>
    </table>

    `;


    html += `
        <p><strong>Approver</strong>: ${po.approverName == null ? '' : po.approverName}</p>
    `;



    return html;

}

export const filesToAttachments = async (files) => {
    let attachments = [];

    files.forEach( async (i) => {

        let b = i.file;
        //if file is not is base64 convert it to base64
        if (typeof i.file != "string") {
            b = await readUploadedFileAsBase64(i.file);
        }

        attachments.push({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: i.name,
            contentBytes: b
        });

    });


    return new Promise((resolve, reject) => {
        resolve(attachments);
    });

}

export const readUploadedFileAsBase64 = (inputFile) => {
    const temporaryFileReader = new FileReader();
  
    return new Promise((resolve, reject) => {

      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException("Problem parsing input file."));
      };
  
      temporaryFileReader.onload = () => {
        var dataUrl = temporaryFileReader.result;
        var base64 = dataUrl.split(',')[1];
        resolve(base64);
      };

      temporaryFileReader.readAsDataURL(inputFile);

    });
};