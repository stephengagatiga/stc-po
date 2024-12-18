import * as React from 'react';
import styles from './StcPo.module.scss';
import {useState,useRef,useContext, useEffect} from "react";
import numeral from 'numeral';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { SERVER, CURRENCY, UPLOAD_MAX_FILE_SIZES_MB, APPROVER_SERVER, myMSALObj, REMARKS_MAX_LINE, MAX_QTY } from '../utils/constant';
import { addLeadingZeroIfOneDigit, getLinesCountOfItemsAndRemarks, getApproversThatMeetRequirements, jsDateToSqlDate, getPOHTMLFormat, filesToAttachments } from '../utils/utils';
import {AppContext} from './StcPo';
import PreviewPDF from './PreviewPDF';
import { pdfjs } from 'react-pdf';
import LoadingModal from './LoadingModal';

const NewPO = (props) => {

    const context = useContext(AppContext);
    const [isLoading,setLoading] = useState(true);
    const [showLoadingModal,setShowLoadingModal] = useState(false);
    const [requestMessage,setRequestMessage] = useState("");
    const [requestErrorMessage,setRequestErrorMessage] = useState("");
    const [requestHasError,setRequestHasErrorMessage] = useState("");
    const [formHasError,setFormHasError] = useState(false);

    //reference for remarks
    //this used to adjust the height of the textare when loaded and during input
    //so that we could count its line break base on its height
    const remarksRef = useRef(null);


    const [itemsError,setItemsError] = useState("");
    const [referenceNumberError,setReferenceNumberError] = useState("");
    const [supplierError,setSupplierError] = useState("");
    const [contactPersonError,setContactPersonError] = useState("");
    const [customerError,setCustomerError] = useState("");
    const [currencyError,setCurrencyError] = useState("");
    const [approverError,setApproverError] = useState("");
    const [termsOfPaymentError,setTermsOfPaymentError] = useState("");
    const [showPDFPreview,setShowPDFPreview] = useState(false);
    const [pdf,setPdf] = useState(null);
    const [pdfPagesNumbering,setPdfPagesNumbering] = useState([]);
    const [previewPDFisLoading,setPreviewPDFisLoading] = useState(false);

    //this holds the data to check if the max count of line in remarks is reached
    const [isMaxLinesInRemarksReach,setMaxLinesInRemarksReach] = useState(false);


    useEffect(() => {
        //adjust the height of textarea based on the scroll height
        //this is solve the issue when user exit this component then go back again the height of the textarea is set to default
        //and the text on it (if has multiline text) are hidden
            for (let index = 0; index < document.getElementsByClassName("textarea").length-1; index++) {
            let ele = document.getElementsByClassName("textarea")[index];
            ele.style.height = (25+ele.scrollHeight)+"px";
        }
    }, []);
    
    const changeOrderItemValue = (id,property,value) => {
        if (property == "price") {
            if (value == "-0") {
                return false;
            }
            
            if (Number(value).toString() == "NaN" && value != "-") {
                return false;
            }
        }

        let tmpItems = JSON.parse(JSON.stringify(context.state.items));

        //set the value of which item that need to change
        tmpItems.forEach(r => {
            if (r.id == id) {
                r[property] = value;
            }
        });

        //check if you need to add another row
        let lastRow = tmpItems[tmpItems.length-1];

        let isQuantityEmpty = true
        if (lastRow.quantity != "" || lastRow.quantity != 0) {
            isQuantityEmpty = false;
        }

        let isNameEmpty = true;
        if (lastRow.name.trim() != "") {
            isNameEmpty = false;
        }

        let isPriceEmpty = true;
        if (lastRow.price != "" || lastRow.price != 0) {
            isPriceEmpty = false;
        }

        if (!isQuantityEmpty || !isNameEmpty || !isPriceEmpty) {
            tmpItems.push( {
                id: lastRow.id+1,
                quantity: "",
                name: "",
                price: "",
                hasError: false,
                quantityError: "",
                nameError: "",
                priceError: ""
            });
        }

     

        context.dispatch.setItemsDispatch({type: 'CHANGE', value: tmpItems});

        //Change the discount
        let total = 0;
        tmpItems.forEach(i => {
            total += itemTotal(i);
        });

        let rawDiscount = (Number(context.state.discount)/100)*total;
        let discAmount = numeral(rawDiscount).format('0,0.00');
        context.dispatch.setDiscountAmountDispatch({type: 'CHANGE', value: discAmount});
        context.dispatch.setTotalAmountDispatch({type: 'CHANGE', value: total-rawDiscount});

        validateApproverSelection(total,rawDiscount,context.state.currency);

    };

    const validateApproverSelection = (total, discAmount,currency) => {
        let tmpCurrency = CURRENCY.filter(i => i.id == Number(currency))[0];
        let approversThatMeetReq = getApproversThatMeetRequirements(context.state.approvers, total - discAmount, tmpCurrency.code);
        if (approversThatMeetReq.filter(i => i.id == context.state.approver).length == 0) {
            context.dispatch.setApproverDispatch({type: 'CHANGE', value: ""});
        }
    }

    const onCurrencyChange = (e) => {
        context.dispatch.setCurrencyDispatch({type: 'CHANGE', value: Number(e.currentTarget.value)});
        let total = orderTotal();
        let discAmount = (Number(context.state.discount)/100)*total;

        validateApproverSelection(total,discAmount,e.currentTarget.value);
    }

    const itemTotal = (item) => {
        return item.quantity * item.price;
    };

    const orderTotal = () => {
        let total = 0;
        context.state.items.forEach(i => {
            total += itemTotal(i);
        });
        return total;
    };

    const removeItem = (e) => {
        let id = e.currentTarget.getAttribute('data-id');
        let r = context.state.items.filter(i => i.id != id);
        context.dispatch.setItemsDispatch({type: 'CHANGE', value: r});

        let total = 0;
        r.forEach(i => {
            total += itemTotal(i);
        });
        let discAmount = (Number(context.state.discount)/100)*total;
        context.dispatch.setDiscountAmountDispatch({type: 'CHANGE', value: discAmount});
        context.dispatch.setTotalAmountDispatch({type: 'CHANGE', value: total-discAmount});
    };

    const checkIfItemsAreValid = () => {
        let tmpR = JSON.parse(JSON.stringify(context.state.items));

        let noErrors = true;

        //Clear all errors
        for (let i = 0; i < tmpR.length-1; i++) {
                tmpR[i].hasError = false;
                tmpR[i].quantityError = "";
                tmpR[i].nameError = "";
                tmpR[i].priceError = "";
        }

        for (let i = 0; i < tmpR.length-1; i++) {
            let hasError = false;

            if (String(tmpR[i].quantity).trim() == "") {
                hasError = true;
                tmpR[i].quantityError = "Invalid";
            } else if (Number(tmpR[i].quantity) == NaN) {
                hasError = true;
                tmpR[i].quantityError = "Invalid";
            } else if ((tmpR[i].quantity % 1 ) != 0 ) {
                hasError = true;
                tmpR[i].quantityError = "Invalid";
            } else {
                tmpR[i].quantityError = "";
            }

            if (tmpR[i].name == "") {
                hasError = true;
                tmpR[i].nameError = "Item name is empty";
            } else {
                tmpR[i].nameError = "";
            }

            if (String(tmpR[i].price).trim() == "") {
                hasError = true;
                tmpR[i].priceError = "Invalid";
            } else if (Number(tmpR[i].price) == NaN) {
                hasError = true;
                tmpR[i].priceError = "Invalid";
            } else {
                tmpR[i].priceError = "";
            }

            if (hasError) {
                noErrors = false;
            }

            tmpR[i].hasError = hasError;
         
        }

        if (context.state.items.length == 1) {
            noErrors = false;
        }

        context.dispatch.setItemsDispatch({type: 'CHANGE', value: tmpR});

        return noErrors;
    };

    const clearFields = () => {
        setItemsError("");
        context.dispatch.setReferenceNumberDispatch({type: 'CHANGE', value: ""});
        setReferenceNumberError("");
        context.dispatch.setSupplierDispatch({type: 'CHANGE', value: ""});
        setSupplierError("");
        context.dispatch.setContactPersonDispatch({type: 'CHANGE', value: ""});
        setContactPersonError("");
        context.dispatch.setCustomerDispatch({type: 'CHANGE', value: ""});
        setCustomerError("");
        setFormHasError(false);
        context.dispatch.setEstDateDispatch({type: 'CHANGE', value: null});
        context.dispatch.setCurrencyDispatch({type: 'CHANGE', value: 1});
        context.dispatch.setApproverDispatch({type: 'CHANGE', value: ""});
        setApproverError("");
        context.dispatch.setRemarksDispatch({type: 'CHANGE', value: ""});
        context.dispatch.setInternalNoteDispatch({type: 'CHANGE', value: ""});
        context.dispatch.setItemsDispatch({type: 'CHANGE', value: [{
            id: 0,
            quantity: "",
            name: "",
            price: "",
            hasError: false,
            quantityError: "",
            nameError: "",
            priceError: ""
        }]});
        context.dispatch.setRemarksDispatch({type: 'CHANGE', value: ""});
        context.dispatch.setDiscountDispatch({type: 'CHANGE', value: ""});
        context.dispatch.setDiscountAmountDispatch({type: 'CHANGE', value: 0});
        context.dispatch.setTotalAmountDispatch({type: 'CHANGE', value: 0});
        context.dispatch.setAttachmentsDispatch({type: 'CHANGE', value: []});
        context.dispatch.setAttachmentsExternalDispatch({type: 'CHANGE', value: []});
        context.dispatch.setTermsOfPaymentDispatch({type: 'CHANGE', value: ""})

    };

    const onDiscountChange = (e) => {
        let total = orderTotal();
        let discAmount = 0;
        let rawDiscount = 0;
        if (Number(e.currentTarget.value) >= 0 && Number(e.currentTarget.value) <= 100) {
            context.dispatch.setDiscountDispatch({type: 'CHANGE', value: e.currentTarget.value});  
            rawDiscount = Number((e.currentTarget.value)/100)*total;
            discAmount = numeral(rawDiscount).format('0,0.00');
            context.dispatch.setDiscountAmountDispatch({type: 'CHANGE', value: discAmount});
            context.dispatch.setTotalAmountDispatch({type: 'CHANGE', value: total-rawDiscount});
        } else if (e.currentTarget.value == ".") {
            context.dispatch.setDiscountDispatch({type: 'CHANGE', value: e.currentTarget.value});  
        }

        validateApproverSelection(total, rawDiscount, context.state.currency);
    };

    const changeTextAreaHeight = (e) => {
        e.currentTarget.style.height = "1px";
        e.currentTarget.style.height = (25+e.currentTarget.scrollHeight)+"px";
    }

    const checkRemarksMaxLines = () => {
        if (remarksRef.current.clientHeight >= REMARKS_MAX_LINE) {
            setMaxLinesInRemarksReach(true);
        } else {
            setMaxLinesInRemarksReach(false);
        }
    }

    const onSaveDraftPO = () => {
   
        //prevent the user from creating more lines in remarks
        if (isMaxLinesInRemarksReach) {
            setFormHasError(true);
            return;
        }

        setShowLoadingModal(true);
        setLoading(true);
        setRequestHasErrorMessage(false);
        setRequestMessage("Saving PO as draft...");

        let POPendingItems = [];
        for (let index = 0; index < context.state.items.length-1; index++) {
            POPendingItems.push(
                {order: index, 
                name: context.state.items[index].name, 
                price: Number(context.state.items[index].price), 
                quantity: Number(context.state.items[index].quantity),
                total: Number(context.state.items[index].quantity) * Number(context.state.items[index].price)
            });                   
        }

        let tmpSupplier;
        if (context.state.supplier == "") {
                tmpSupplier = {
                    name: "",
                    address: ""
                }
        } else {
            tmpSupplier = context.state.suppliers.filter(i => i.id == Number(context.state.supplier))[0];
        }


        let tmpContactPerson;
        if (context.state.contactPerson == "") {
                tmpContactPerson = {
                    id: "",
                    firstName: "",
                    lastName: ""
                }
        } else {
                tmpContactPerson =tmpSupplier.contactPersons.filter(i => i.id == Number(context.state.contactPerson))[0];
        }
        
        let tmpApprover;
        if (context.state.approver == "") {
                tmpApprover = {
                    id: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    jobTitle: ""
                }
        } else {
            tmpApprover = context.state.approvers.filter(i => i.id == Number(context.state.approver))[0];
        }

        let tmpCurrency = CURRENCY.filter(i => i.id == Number(context.state.currency))[0];

        let totalLinesStringArray = getLinesCountOfItemsAndRemarks(remarksRef);

        let formData = new FormData();
        formData.append('referenceNumber',context.state.referenceNumber);
        formData.append('supplierId',context.state.supplier == "" ? "" : Number(context.state.supplier));
        formData.append('supplierName',tmpSupplier.name);
        formData.append('supplierAddress',tmpSupplier.address);
        formData.append('contactPersonId',tmpContactPerson.id == "" ? "" : Number(tmpContactPerson.id));
        formData.append('contactPersonname',`${tmpContactPerson.firstName} ${tmpContactPerson.lastName}`);
        formData.append('customerName',context.state.customer);
        //Date format should be YYYY-MM-DD
        formData.append('estimatedArrival',context.state.estDate == null ? "" : context.state.estDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((context.state.estDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(context.state.estDate.getDate()));
        formData.append('currency',tmpCurrency.symbol);
        formData.append('currencyCode',tmpCurrency.code);
        formData.append('approverId',tmpApprover.id == null ? "" : Number(tmpApprover.id));
        formData.append('approverName',`${tmpApprover.firstName} ${tmpApprover.lastName}`);
        formData.append('approverEmail',tmpApprover.email);
        formData.append('approverJobTitle',tmpApprover.jobTitle);
        formData.append('remarks',context.state.remarks == null ? "" : context.state.remarks);
        formData.append('internalNote',context.state.internalNote == null ? "" : context.state.internalNote);
        formData.append('discount',Number(context.state.discount));
        formData.append('createdById',context.state.user.id);
        formData.append('createdByName',`${context.state.user.firstName} ${context.state.user.lastName}`);
        formData.append('requestorEmail',context.state.user.email);
        formData.append('pOPendingItemsJsonString',JSON.stringify(POPendingItems));
        formData.append('textLineBreakCount',totalLinesStringArray);

        formData.append('sIOrBI',context.state.sIOrBI);
        formData.append('termsOfPayment',String(context.state.termsOfPayment));
        //Date format should be YYYY-MM-DD
        formData.append('invoiceDate',context.state.invoiceDate == null ? "" : context.state.invoiceDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((context.state.invoiceDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(context.state.invoiceDate.getDate()));

        context.state.attachments.forEach(a => {
            formData.append('files', a.file);
        });

        context.state.attachmentsExternal.forEach(a => {
            formData.append('externalFiles', a.file);
        });
        
        axios.post(`${SERVER}/po/draft`, formData, {headers: {
            'Content-Type': 'multipart/form-data',
            "Access-Control-Allow-Origin": "*"
          }})
            .then(response => {
                clearFields();
                setRequestMessage("PO draft saved!");
            })
            .catch(error => {
                setRequestMessage("Request Failed.");
                setRequestHasErrorMessage(true);
                setRequestErrorMessage(error.response.data);
            })
            .finally(() => {
                setLoading(false);
            })
    };
    
    const onSubmitPO = async () => {
        let tmpA = await filesToAttachments(context.state.attachments);

        let hasError = false;
        setReferenceNumberError("");
        setSupplierError("");
        setContactPersonError("");
        setCustomerError("");
        setCurrencyError("");
        setApproverError("");
        setItemsError("");

        if (isMaxLinesInRemarksReach) {
              hasError = true;
        }

        if (context.state.referenceNumber.trim() == "") {
            hasError = true;
            setReferenceNumberError("Reference number is empty");
        }

        if (context.state.supplier == "") {
            hasError = true;
            setSupplierError("No supplier selected");
        }

        if (context.state.contactPerson == "") {
            hasError = true;
            setContactPersonError("No contact persons selected");
        }

        if (context.state.customer == "") {
            hasError = true;
            setCustomerError("Customer is empty");
        }

        if (context.state.approver == "") {
            hasError = true;
            setApproverError("No approver selected");
        }

        if (isNaN(context.state.termsOfPayment)) {
            if (context.state.termsOfPayment != "COD") {
                hasError = true;
                setTermsOfPaymentError("Invalid");
            } 
        } else {
            if (Number(context.state.termsOfPayment) < 0) {
                hasError = true;
                setTermsOfPaymentError("Invalid");
            }   
        }

        let tmpCurrency = CURRENCY.filter(i => i.id == Number(context.state.currency))[0];
        let approversThatMeetReq = getApproversThatMeetRequirements(context.state.approvers, context.state.totalAmount, tmpCurrency.code);

        if (approversThatMeetReq.length == 0 && context.state.approvers.length != 0) {
            hasError = true;
        }

        if (context.state.items.length == 1) {
            hasError = true;
            setItemsError("No item");
        }

        if (!checkIfItemsAreValid()) {
            hasError = true;
        }

        setFormHasError(hasError);

        if (!hasError) {
            let totalLinesStringArray = getLinesCountOfItemsAndRemarks(remarksRef);

            setShowLoadingModal(true);
            setLoading(true);
            setRequestHasErrorMessage(false);
            setRequestMessage("Saving PO...");
    
            let POPendingItems = [];
            for (let index = 0; index < context.state.items.length-1; index++) {
                POPendingItems.push({order: index, name: context.state.items[index].name, price: Number(context.state.items[index].price), quantity: Number(context.state.items[index].quantity) });                   
            }

            let tmpSupplier = context.state.suppliers.filter(i => i.id == Number(context.state.supplier))[0];
            let tmpContactPerson = tmpSupplier.contactPersons.filter(i => i.id == Number(context.state.contactPerson))[0];
            let tmpApprover = context.state.approvers.filter(i => i.id == Number(context.state.approver))[0];

            let formData = new FormData();
            formData.append('referenceNumber',context.state.referenceNumber);
            formData.append('supplierId',Number(context.state.supplier));
            formData.append('supplierName',tmpSupplier.name);
            formData.append('supplierAddress',tmpSupplier.address);
            formData.append('contactPersonId',Number(tmpContactPerson.id));
            formData.append('contactPersonname',`${tmpContactPerson.firstName} ${tmpContactPerson.lastName}`);
            formData.append('customerName',context.state.customer);
            //Date format should be YYYY-MM-DD  
            formData.append('estimatedArrival',context.state.estDate == null ? "" : context.state.estDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((context.state.estDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(context.state.estDate.getDate()));
            formData.append('currency',tmpCurrency.symbol);
            formData.append('currencyCode',tmpCurrency.code);
            formData.append('approverId',Number(tmpApprover.id));
            formData.append('approverName',`${tmpApprover.firstName} ${tmpApprover.lastName}`);
            formData.append('approverEmail',tmpApprover.email);
            formData.append('approverJobTitle',tmpApprover.jobTitle);
            formData.append('remarks',context.state.remarks == null ? "" : context.state.remarks);
            formData.append('internalNote',context.state.internalNote == null ? "" : context.state.internalNote);
            formData.append('discount',Number(context.state.discount));
            formData.append('createdById',context.state.user.id);
            formData.append('createdByName',`${context.state.user.firstName} ${context.state.user.lastName}`);
            formData.append('requestorEmail',context.state.user.email);
            formData.append('pOPendingItems',JSON.stringify(POPendingItems));
            formData.append('textLineBreakCount',totalLinesStringArray);

            formData.append('sIOrBI',context.state.sIOrBI);
            formData.append('termsOfPayment',String(context.state.termsOfPayment).toUpperCase());
            //Date format should be YYYY-MM-DD
            formData.append('invoiceDate',context.state.invoiceDate == null ? "" : context.state.invoiceDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((context.state.invoiceDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(context.state.invoiceDate.getDate()));
            
            context.state.attachments.forEach(a => {
                formData.append('files', a.file);   
            });

            context.state.attachmentsExternal.forEach(a => {
                formData.append('externalFiles', a.file);
            });

            axios.post(`${SERVER}/po`, formData, {headers: {
                'Content-Type': 'multipart/form-data',
                "Access-Control-Allow-Origin": "*"
              }})
                .then(async (response) => {
                    let poCreated = response.data;
                    clearFields();
                    setRequestMessage("PO created. Sending email to approver...");

                    let emailBody = '';
                    let subject = `PO No. ${poCreated.orderNumber} - ${poCreated.customerName} - For approval`;
                    

                    emailBody += getPOHTMLFormat(poCreated);

                    emailBody += `
                        <p style='width: 100%; height: 22px; text-align: left;'>&nbsp;<span style='font-family: arial, helvetica, sans-serif;'>Requested by: ${`${context.state.user.firstName} ${context.state.user.lastName}`} </span></p>
                    `;

                    emailBody += `
                    <table style='border-collapse: collapse; width: 100%;' border='0'>
                        <tbody>
                            <tr>
                                <td style='width: 33.3333%; text-align: center;'><span style='font-family: arial, helvetica, sans-serif;'><a href='${APPROVER_SERVER}/l/reject/${poCreated.guid}' target='_blank' rel='noopener' aria-invalid='true'>Reject</a></span></td>
                                <td style='width: 33.3333%;'>&nbsp;</td>
                                <td style='width: 33.3333%; text-align: center;'><span style='font-family: arial, helvetica, sans-serif;'><a href='${APPROVER_SERVER}/l/approve/${poCreated.guid}' target='_blank' rel='noopener' aria-invalid='true'>Approve</a></span></td>
                            </tr>
                        </tbody>
                    </table>
                    <p><span style='color: #7e8c8d; font-size: 10pt; font-family: arial, helvetica, sans-serif;'><em>This is system generated message, please do not reply.</em></span></p>
                    `;

                    let requestObj = {
                        scopes: ["Mail.Send"]
                    };


                    let data = {
                        message: {
                            subject: subject,
                            body: {
                                contentType: "HTML",
                                content: emailBody
                            },
                            toRecipients: [
                                {
                                    emailAddress: {
                                        address: tmpApprover.email
                                    }
                                }
                            ],
                            ccRecipients: [],
                            attachments: tmpA
                        }
                    };

                    let emailBodyNoAttachment = {
                        subject: subject,
                        body: {
                            contentType: "HTML",
                            content: emailBody
                        },
                        toRecipients: [
                            {
                                emailAddress: {
                                    address: tmpApprover.email
                                }
                            }
                        ],
                        ccRecipients: []
                    };

                    myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {


                        let isEmailCreated = false;
                        setRequestMessage("Creating email...");


                        axios.post('https://graph.microsoft.com/v1.0/me/messages', emailBodyNoAttachment,  { headers: {
                                'Authorization': 'Bearer ' + tokenResponse.accessToken,
                        }})
                        .then(async (responseMsg) => {
                            let messageId = responseMsg.data.id;

                            isEmailCreated = true;


                            for (let index = 0; index < tmpA.length; index++) {
                                let item = tmpA[index];
                                setRequestMessage(`(${index+1}/${tmpA.length}) Uploading attachment (${item.name})....`);

                                let fileItem = context.state.attachments.filter(i => i.name == item.name)[0];
                                let MAX_CHUNK = 1024*1024*3;
        
                                //file is more than 3mb
                                if (fileItem.file.size > MAX_CHUNK) {

                                    let uploadItem = {
                                        "AttachmentItem": {
                                          "attachmentType": "file",
                                          "name": fileItem.file.name,
                                          "size": fileItem.file.size
                                        }
                                      };

                                    //create upload session
                                    let uploadSession = await axios.post(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/createUploadSession`, uploadItem,  { headers: {
                                        'Authorization': 'Bearer ' + tokenResponse.accessToken,
                                    }})


                                    let url = uploadSession.data.uploadUrl;



                                    let uploadCount = Math.ceil(fileItem.file.size / MAX_CHUNK);
                                    let start = 0;
                                    let end = MAX_CHUNK;
        
                                    for (let index2 = 0; index2 < uploadCount; index2++) {
                                        let d = fileItem.file.slice(start, end);
                                        await axios.put(url, d, {
                                            headers: {
                                                "Content-Type": "application/octet-stream",
                                                "Content-Range": `bytes ${start}-${end-1}/${fileItem.file.size}`
                                            }
                                        });
                                        start = end;
                                        end = Math.min(start+MAX_CHUNK, fileItem.file.size);
                                    }
        
                                } else {

                                    let r = await axios.post(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`, item,  { headers: {
                                        'Authorization': 'Bearer ' + tokenResponse.accessToken,
                                    }});

                                }

                            }


                            setRequestMessage(`Sending email!`);

                            await axios.post(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/send`, null, { headers: {
                                'Authorization': 'Bearer ' + tokenResponse.accessToken,
                            }});
                
                            setRequestMessage(`Updating logs...`);

                            let logData = {
                                POPendingId: poCreated.id,
                                UserName: `${context.state.user.firstName} ${context.state.user.lastName}`,
                                Message: "Sent email approval to: " + tmpApprover.email
                            };

                            await axios.post(`${SERVER}/po/audittrail`, logData, { headers: {"Access-Control-Allow-Origin": "*"} })
                            .then(response => {

                            })
                            .catch(error => {
                        
                            })
                            .finally(() => {

                            });

                            setRequestMessage(`Done!`);

                            setLoading(false);
                        })
                        .catch(responseMsgError => {
                            setRequestHasErrorMessage(true);
                            if (isEmailCreated) {
                                setRequestMessage("Failed to send email. Please check you draft folder in outlook to manually send the email.");
                            } else {
                                setRequestMessage("Failed to send email. Please try again.");
                            }
                            setRequestErrorMessage(responseMsgError.response.data.error.message);
                        })
                        .finally(() => {
                            setLoading(false);
                        });

                
                    }).catch(function (error2) {
                        setRequestHasErrorMessage(true);
                        setRequestMessage("Unable to send email. Failed to get token. Please try to send it again");
                        setRequestErrorMessage(error2.response.data.error.message);
                    });


                })
                .catch(error => {
                    setRequestHasErrorMessage(true);
                    setRequestMessage("Request Failed.");
                    setRequestErrorMessage(error.response.data);
                })
                .finally(() => {

                });
        }

    };

    const addAttachments = (e, list, dispatch) => {
        
        //get the file
        let file = e.currentTarget.files[0];
        
        //the purpose of below is for retaining the data

        //create new temporary var
        let tmp = [];

        //populate the tmp var
        list.forEach( (i) => {

            let newFile = new File([i.file], i.file.name);
            let f = { file:  newFile, name: i.name };
            tmp.push(f);
        });

        //push the new item

        let newFile = new File([file], file.name);
        tmp.push({file: newFile, name: file.name});

        //update the state
        dispatch({type: 'CHANGE', value: tmp});

        //so the file name will not appear in the input file
        e.currentTarget.value = "";
    }

    const removeAttachment = (index, list, dispatch) => {
        //create new temporary var
        let tmp = [];
        //filter the item removing the selected attachment then populate the tmp var
        list.filter((v,itemIndex) => itemIndex != index).forEach(i => {
            // let newFile  = new Blob([i.file], {type: i.file.type});
            // newFile.name = i.name;
            // newFile.lastModifiedDate = i.file.lastModifiedDate;

            let newFile = new File([i.file], i.name);

            tmp.push({ file: newFile, name: i.name });
        });

        //update the state
        dispatch({type: 'CHANGE', value: tmp});
    }

    const getTotalFilesCountAndSizeInternal = (list) => {
        let total = 0;
        let count = 0;

        if (list != undefined) {
            list.forEach(i => {
                total += i.file.size;
                count += 1;
            });
        }

        return {
            total: Number.parseFloat((total/1024)/1024).toFixed(2),
            count
        };
    }

    const onPreviewClick = () => {

        setPreviewPDFisLoading(true);

        let POPendingItems = [];
        for (let index = 0; index < context.state.items.length-1; index++) {
            POPendingItems.push({name: context.state.items[index].name, price: Number(context.state.items[index].price), quantity: Number(context.state.items[index].quantity) });                   
        }

        let totalLinesStringArray = getLinesCountOfItemsAndRemarks(remarksRef);

        let tmpSupplierName = "";
        let tmpSupplierAddress = "";
        let tmpSupplier = null;

        if (context.state.supplier != "") {
            tmpSupplier = context.state.suppliers.filter(s => s.id === Number(context.state.supplier))[0];
            tmpSupplierName = tmpSupplier.name;
            tmpSupplierAddress = tmpSupplier.address;
        }

        let tmpContactPersonName = "";

        if (context.state.contactPerson != "") {
            let tmp = tmpSupplier.contactPersons.filter(c => c.id === Number(context.state.contactPerson))[0];
            tmpContactPersonName = `${tmp.firstName} ${tmp.lastName}`;
        }
        
        let tmpCurrency = CURRENCY.filter(i => i.id == Number(context.state.currency))[0];

        let tmpApprover = {id: "", firstName: "", lastName: "", jobTitle: ""};

        if (context.state.approver != "") {
            tmpApprover = context.state.approvers.filter(a => a.id === Number(context.state.approver))[0];
        }

        let data = {
            referenceNumber: context.state.referenceNumber,
            supplierName: tmpSupplierName,
            supplierAddress: tmpSupplierAddress,
            contactPersonName: tmpContactPersonName,
            customerName: context.state.customer,
            estimatedArrival: jsDateToSqlDate(context.state.estDate),
            currency: tmpCurrency.symbol,
            approverName: `${tmpApprover.firstName} ${tmpApprover.lastName}`,
            approverJobTitle: tmpApprover.jobTitle,
            approverId: Number(tmpApprover.id),
            discount: Number(context.state.discount),
            remarks: context.state.remarks,
            pOPendingItemsJsonString: JSON.stringify(POPendingItems),
            textLineBreakCount: totalLinesStringArray,
            approvedOn: null,

            invoiceDate: jsDateToSqlDate(context.state.invoiceDate),
            termsOfPayment: String(context.state.termsOfPayment),
            sIOrBI: context.state.sIOrBI

        };


        axios.post(`${SERVER}/po/pdf/preview`, data, { 
            responseType: 'arraybuffer',
            headers: {
                'Accept': 'application/pdf',
                "Access-Control-Allow-Origin": "*"
            }
        })
            .then(response => {

                pdfjs.getDocument(response.data)
                    .then(doc => {
                        let p = [];
                        for (let index = 1; index <= doc.numPages; index++) {
                            p.push(index);
                        }
                        setPdfPagesNumbering(p);
                        setPdf(response.data);
                        setShowPDFPreview(true);
                        setPreviewPDFisLoading(false);
                    })
                    .catch(error => {
                        console.log(error);
                    });
            })
            .catch(error => {
                console.log(error);
            })

    }

    const AttachmentsComponent = (attachmentProps) => {

        return <div>
            
            <div className={styles.row} style={{alignItems: 'center'}}>
                <h2>{attachmentProps.title} ({getTotalFilesCountAndSizeInternal(attachmentProps.attachmentList).count} {getTotalFilesCountAndSizeInternal(attachmentProps.attachmentList).count <= 1 ? `File` : `Files`}, {getTotalFilesCountAndSizeInternal(attachmentProps.attachmentList).total}MB)</h2>
            </div>
            <div className={styles.hr}></div>
            {
                attachmentProps.attachmentList.map((a,i) => 
                    <div className={styles.row} style={{alignItems: 'center', marginBottom: '10px'}} key={i}>
                        <div className={styles.smallX} style={{marginRight: '15px'}} onClick={e => attachmentProps.removeAttachment(i)}>X</div>
                        {a.name}
                    </div>     
                )
            }

            <input id={attachmentProps.inputId} type="file" onChange={e => attachmentProps.addAttachment(e)} style={{display: 'none'}} />
            <label className={styles.uploadLabel} htmlFor={attachmentProps.inputId}>Select the file you want to upload</label>
            <br/>
            <br/>
            {/* {
                Number(getTotalFilesCountAndSizeInternal(attachmentProps.attachmentList).total) > UPLOAD_MAX_FILE_SIZES_MB &&
                <div className={styles.error}>You exceed the maximun file size limit</div>
            } */}
            <i>Max of 10 MB total attachments.</i>
        </div>
    }

    let tmpCurrency = CURRENCY.filter(i => i.id == Number(context.state.currency))[0];
    let approversThatMeetReq = getApproversThatMeetRequirements(context.state.approvers, context.state.totalAmount, tmpCurrency.code);

    return <div className={styles.newPO}>
        <div className={styles.row} style={{alignItems: 'center'}}>
            <h2>New Purchase Order</h2>
            <div className={styles.row} style={{marginLeft: 'auto'}}>
                {
                    previewPDFisLoading ?
                    <span>Loading please wait...</span>
                    :
                    <a className={styles.link} onClick={onPreviewClick}>Preview</a>
                }
            </div>
        </div>
        <div className={styles.hr}></div>
        <div className={styles.rowField}>
            <div className={styles.label}>Supplier</div>
            <div>
                {
                    context.state.isSuppliersLoading ?
                    <p>Fetching suppliers...</p>
                    :
                    <select value={context.state.supplier} onChange={e => {context.dispatch.setSupplierDispatch({ type: 'CHANGE', value: e.currentTarget.value}); context.dispatch.setContactPersonDispatch({type: 'CHANGE', value: ""}); } } >
                        <option value=""></option>
                        {
                            context.state.suppliers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                        }
                    </select>
                }
            </div>
            <div className={styles.label}>PO #</div>
            <div>
                <input type="text" readOnly={true} value="---" disabled={true} />
            </div>
        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div className={styles.error}>{supplierError}</div>
            <div></div>
            <div></div>
        </div>
        <div className={styles.rowField}>
            <div className={styles.label}>Address</div>
            <div>
                {
                    context.state.supplier != "" &&
                    context.state.suppliers.filter(i => i.id == Number(context.state.supplier))[0].address
                }
            </div>
            <div className={styles.label}>Reference #</div>
            <div>
                <input type="text" value={context.state.referenceNumber} onChange={e => context.dispatch.setReferenceNumberDispatch({type: 'CHANGE', value: e.currentTarget.value})} />
            </div>
        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div></div>
            <div></div>
            <div className={styles.error}>{referenceNumberError}</div>
        </div>
        <div className={styles.rowField}>
            <div className={styles.label}>Contact Person</div>
            <div>
                <select value={context.state.contactPerson} onChange={e => context.dispatch.setContactPersonDispatch({type: 'CHANGE', value: e.currentTarget.value}) } >
                    <option value=""></option>
                    {
                        context.state.supplier != "" &&
                        context.state.suppliers.filter(i => i.id == Number(context.state.supplier))[0].contactPersons.map(i => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)
                    }
                </select>
            </div>

            <div className={styles.label}>Expected Delivery</div>
            <div>
                <div>
                    <DatePicker
                        selected={context.state.estDate}
                        onChange={value => context.dispatch.setEstDateDispatch({type: 'CHANGE', value: value})}
                        minDate={new Date()}
                        popperPlacement="top-end"
                    />
                </div>
            </div>

        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div className={styles.error}>{contactPersonError}</div>
            <div></div>
            <div></div>
        </div>
        <div className={styles.rowField}>
            <div className={styles.label}>S.I# or B.I#</div>
            <div>
                <input type="text" value={context.state.sIOrBI} onChange={e => context.dispatch.setSIOrBIDispatch({type: 'CHANGE', value: e.currentTarget.value})} disabled />
            </div>

            <div className={styles.label}>Terms of Payment</div>
            <div>
                <input placeholder="Days" type="text" value={context.state.termsOfPayment} onChange={e => context.dispatch.setTermsOfPaymentDispatch({type: 'CHANGE', value: e.currentTarget.value})} />
            </div>

        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div className={styles.error}></div>
            <div></div>
            <div className={styles.error}>{termsOfPaymentError}</div>
        </div>
        <div className={styles.rowField}>
            <div className={styles.label}>Invoice Date</div>
            <div>
                 <div>
                    <DatePicker
                        selected={context.state.invoiceDate}
                        onChange={value => context.dispatch.setInvoiceDateDispatch({type: 'CHANGE', value: value})}
                        minDate={new Date()}
                        popperPlacement="top-end"
                        disabled
                    />
                </div>
            </div>

            <div className={styles.label}></div>
            <div>

            </div>

        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div className={styles.error}></div>
            <div></div>
            <div></div>
        </div>
        <div className={styles.rowField}>
            <div className={styles.label}>Customer</div>
            <div>
                <input type="text" value={context.state.customer} onChange={e => context.dispatch.setCustomerDispatch({type: 'CHANGE', value: e.currentTarget.value})} />
            </div>
                
            <div className={styles.label}>Currency</div>
            <div>
                <select value={context.state.currency} onChange={onCurrencyChange} >
                    {
                        CURRENCY.map(c => 
                                <option key={c.id} value={c.id}>{c.symbol} - {c.code}</option>
                        )
                    }
                </select>
            </div>
        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div className={styles.error}>{customerError}</div>
            <div></div>            
            <div className={styles.error}>{currencyError}</div>
        </div>
                    
        <br/>
  

        <div className={styles.row} style={{marginBottom: '5px'}}>
            <div style={{width: '70px'}} className={styles.tableHeaderRowForm}>Quantity</div>
            <div style={{width: "630px"}} className={styles.tableHeaderRowForm}>Description</div>
            <div style={{width: '110px'}} className={styles.tableHeaderRowForm}>Unit Price</div>
            <div style={{width: '130px', textAlign: 'right'}} className={styles.tableHeaderRowForm}>Amount</div>
            <div style={{width: '40px'}} className={styles.tableHeaderRowForm}></div>
        </div>
        {
            context.state.items.map((i,index) =>
                <div className={styles.row} key={i.id}>
                    <div style={{width: '70px'}} className={styles.tableRowForm}>
                        <input className={styles.numbers} type="text" value={i.quantity} style={{textAlign: 'right'}} onChange={e => (Number(e.currentTarget.value) < MAX_QTY && Number(e.currentTarget.value) >= 0) && changeOrderItemValue(i.id,'quantity', e.currentTarget.value) } />
                        <div className={styles.error}>{i.quantityError}</div>
                    </div>
                    <div style={{flexGrow: 1}} className={styles.tableRowForm}>
                        <textarea className="textarea" wrap="hard"  onChange={ e =>{  changeTextAreaHeight(e); changeOrderItemValue(i.id,'name',e.currentTarget.value);  }} value={i.name} style={{overflow: "hidden", resize: "none", width: "615px"}} rows={1} ></textarea>
                        <div className={styles.error}>{i.nameError}</div>
                    </div>
                    <div style={{width: '110px'}} className={styles.tableRowForm}>
                        <input className={styles.numbers} type="text" value={i.price} style={{textAlign: 'right'}} onChange={e =>  changeOrderItemValue(i.id,'price',e.currentTarget.value) }/>
                        <div className={styles.error}>{i.priceError}</div>
                    </div>
                    <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                        {
                            context.state.items.length-1 != index &&
                            numeral(Number( itemTotal(i) )).format('0,0.00')
                        }
                    </div>
                    <div style={{width: '40px'}} className={styles.tableRowForm}>
                        {
                            context.state.items.length-1 != index &&
                            <button data-id={i.id} className={styles.buttonSecondary} style={{maxWidth: '40px', minWidth: '40px'}} onClick={removeItem}>X</button>
                        }
                    </div>
                </div>
            )
        }
        <div className={styles.row} style={{justifyContent: 'flex-end'}}>
            <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                {numeral(Number( orderTotal() )).format('0,0.00')}
            </div>
            <div style={{width: '40px'}} className={styles.tableRowForm}></div>
        </div>
        <div className={styles.row} style={{justifyContent: 'flex-end', alignItems: 'center'}}>
            <div className={styles.label}>
                Discount (%)
            </div>
            <div style={{width: '110px'}} className={styles.tableRowForm}>
                <input className={styles.numbers} type="text" value={context.state.discount} onChange={onDiscountChange} />
            </div>
            <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                -{numeral(context.state.discountAmount).format('0,0.00')}
            </div>
            <div style={{width: '40px'}} className={styles.tableRowForm}></div>
        </div>
        <div className={styles.row} style={{justifyContent: 'flex-end', alignItems: 'center'}}>
            <div>
                <strong>Total Amount</strong>
            </div>
            <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.numbers} ${styles.tableRowForm} ${styles.withBorderTop}`}>
                {tmpCurrency.symbol}{numeral(context.state.totalAmount).format('0,0.00')}
            </div>
            <div style={{width: '40px'}} className={styles.tableRowForm}></div>
        </div>


        <div className={styles.error}>
            {itemsError}
        </div>
        <br/>

        <div className={styles.column}>
            <label className={styles.label}>Remarks</label>
            <textarea ref={remarksRef} className="textarea" style={{resize: 'vertical', width: '1000px', display: 'inline-block'}} onChange={e => {checkRemarksMaxLines(); changeTextAreaHeight(e); context.dispatch.setRemarksDispatch({type: 'CHANGE', value: e.currentTarget.value}); }} value={context.state.remarks}>
            </textarea>
        </div>
        {
            isMaxLinesInRemarksReach &&
            <p className={styles.error}>You reached the maximun lines of remarks, please remove some lines.<br/>This will cause an overlap in generating the PDF of this PO.</p>
        }
        <br/>

        <div className={styles.column}>
            <label className={styles.label}>Internal Note</label>
            <textarea className="textarea" style={{resize: 'vertical', width: '1000px'}}  onChange={e => { changeTextAreaHeight(e); context.dispatch.setInternalNoteDispatch({type: 'CHANGE', value: e.currentTarget.value}) }} value={context.state.internalNote}>
            </textarea>
        </div>

    
        <AttachmentsComponent title={"Internal Attachment"}  inputId={"files"} attachmentList={context.state.attachments} addAttachment={e => addAttachments(e, context.state.attachments, context.dispatch.setAttachmentsDispatch)} removeAttachment={index => removeAttachment(index, context.state.attachments, context.dispatch.setAttachmentsDispatch)} />  
        <br/>
        <br/>
        <br/>

        <AttachmentsComponent title={"External Attachment"}  inputId={"externalFiles"} attachmentList={context.state.attachmentsExternal} addAttachment={e => addAttachments(e, context.state.attachmentsExternal, context.dispatch.setAttachmentsExternalDispatch)} removeAttachment={index => removeAttachment(index, context.state.attachmentsExternal, context.dispatch.setAttachmentsExternalDispatch)} />  
        <br/>
        <br/>
        <br/>


        
        {
            formHasError &&
            <div className={`${styles.error} ${styles.errorBorder}`}>
                You have errors, please check all fields.
            </div>
        }
        <br/>
        {
            context.state.isApproverLoading ?
            <p>Getting approvers, please wait...</p>
            :
            <div className={styles.row}>
                <button className={styles.buttonSecondary} onClick={clearFields}>Clear</button>
                <div className={styles.row} style={{marginLeft: 'auto', alignItems: 'center'}}>
                    <button className={styles.buttonSecondary} onClick={onSaveDraftPO}>Save as draft</button>
                    <div className={styles.vr}></div>
                    <label style={{marginRight: '5px'}}>Send this to</label>

                    <div className={styles.column}>
                        <select style={{flexGrow: 1}} value={context.state.approver} onChange={e => context.dispatch.setApproverDispatch({type: 'CHANGE', value: e.currentTarget.value}) } >
                            <option value=""></option>
                            {
                                approversThatMeetReq.map(i => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)
                            }
                        </select>
                    </div>
                    <button className={styles.buttonPrimary} onClick={onSubmitPO}>Send</button>
                </div>
            </div>
        }
        {
            (approversThatMeetReq.length == 0 && context.state.approvers.length != 0) &&
            <div style={{textAlign: 'right'}}>
                <span className={styles.error}>No approver that meet this requirement</span>
            </div>
        }
        <div style={{textAlign: 'right'}} className={styles.error}>{approverError}</div>        
        <br/>
        {
            showPDFPreview &&
            <PreviewPDF pdf={pdf} pdfPagesNumbering={pdfPagesNumbering} close={() => { setShowPDFPreview(false); }} />
        }
        {
            showLoadingModal &&
            <LoadingModal title={"Creating PO"} message={requestMessage} hasError={requestHasError} errorMessage={requestErrorMessage} done={!isLoading} buttonText={"OK"} onClick={e => { setShowLoadingModal(false); } } />
        }
    </div>;

    

};

export default NewPO;
