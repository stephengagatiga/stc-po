import * as React from 'react';
import {useState,useRef,useEffect,useContext} from "react";
import numeral from 'numeral';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { pdfjs } from 'react-pdf';
import * as moment from 'moment';

import styles from './StcPo.module.scss';
import { SERVER, PO_PENDING_VIEWS, UPLOAD_MAX_FILE_SIZES_MB,APPROVER_SERVER, myMSALObj, REMARKS_MAX_LINE, MAX_QTY} from '../utils/constant';
import {AppContext} from './StcPo';
import { addLeadingZeroIfOneDigit, getLinesCountOfItemsAndRemarks, getApproversThatMeetRequirements, jsDateToSqlDate, filesToAttachments, getPOHTMLFormat } from '../utils/utils';

import PreviewPDF from './PreviewPDF';
import LoadingModal from './LoadingModal';

const CURRENCY = [
    {id: 1, symbol: '₱', code: 'PHP'},
    {id: 2, symbol: '$', code: 'USD'},
    {id: 3, symbol: '€', code: 'EUR'},
];


const EditPO = (props) => {

    const context = useContext(AppContext);
    const [displayRequestMessage,setDisplayRequestMessage] = useState("");
    
    const [requestMessage,setRequestMessage] = useState("");
    const [requestErrorMessage,setRequestErrorMessage] = useState("");
    const [requestHasError,setRequestHasErrorMessage] = useState("");

    const [formHasError,setFormHasError] = useState(false);
    const [showPDFPreview,setShowPDFPreview] = useState(false);
    const [pdf,setPdf] = useState(null);
    const [pdfPagesNumbering,setPdfPagesNumbering] = useState([]);
    const [previewPDFisLoading,setPreviewPDFisLoading] = useState(false);

    let tmpItems = [];
    let tmpId = 0;
    let tmpItemsRef = [];

    //reference for remarks
    //this used to adjust the height of the textare when loaded and during input
    //so that we could count its line break base on its height
    const remarksRef = useRef(null);
    
    //reference for notes
    //this used to adjust the height of the textare when loaded and during input
    //so that we could count its line break base on its height
    const notesRef = useRef(null);


    props.data.poPendingItems.forEach(i => {
        tmpItems.push({
            id: tmpId,
            quantity: i.quantity,
            name: i.name,
            price: i.price,
            hasError: false,
            quantityError: "",
            nameError: "",
            priceError: ""
        });
        tmpItemsRef.push(useRef(null));
        tmpId++;
    });

    tmpItems.push({
        id: tmpId,
        quantity: "",
        name: "",
        price: "",
        hasError: false,
        quantityError: "",
        nameError: "",
        priceError: ""
    });

    const [items,setItems] = useState(tmpItems);

    const [itemsError,setItemsError] = useState("");

    const [referenceNumber,setReferenceNumber] = useState(props.data.referenceNumber == null ? "" : props.data.referenceNumber);
    const [referenceNumberError,setReferenceNumberError] = useState("");

    const [supplier,setSupplier] = useState(props.data.supplierId == null ? "" : props.data.supplierId);
    const [supplierError,setSupplierError] = useState("");

    const [contactPerson,setContactPerson] = useState(props.data.contactPersonId == null ? "" : props.data.contactPersonId);
    const [contactPersonError,setContactPersonError] = useState("");

    const [sIOrBI,setSIOrBI] = useState(props.data.siOrBI == null ? "" : props.data.siOrBI);
    const [termsOfPayment,setTermsOfPayment] = useState(props.data.termsOfPayment == null ? "" : props.data.termsOfPayment);
    const [termsOfPaymentError,setTermsOfPaymentError] = useState("");

    const [customer,setCustomer] = useState(props.data.customerName == null ? "" : props.data.customerName);
    const [customerError,setCustomerError] = useState("");


    let tmpDate = null;
    if (props.data.estimatedArrival != null) {
        tmpDate = new Date();
        tmpDate.setFullYear(Number(moment.parseZone(props.data.estimatedArrival).format('YYYY')));
        tmpDate.setDate(Number(moment.parseZone(props.data.estimatedArrival).format('DD')));
        tmpDate.setMonth(Number(moment.parseZone(props.data.estimatedArrival).format('M'))-1);
    }
    const [estDate,setEstDate] = useState(tmpDate);

    let tmpDate2 = null;
    if (props.data.invoiceDate != null) {
        tmpDate2 = new Date();
        tmpDate2.setFullYear(Number(moment.parseZone(props.data.invoiceDate).format('YYYY')));
        tmpDate2.setDate(Number(moment.parseZone(props.data.invoiceDate).format('DD')));
        tmpDate2.setMonth(Number(moment.parseZone(props.data.invoiceDate).format('M'))-1);
    }
    const [invoiceDate,setInvoiceDate] = useState(tmpDate2);

    let currencyId = CURRENCY.filter(c => c.symbol == props.data.currency)[0];
    const [currency,setCurrency] = useState(Number(currencyId.id));
    const [currencyError,setCurrencyError] = useState("");

    const [approver,setApprover] = useState(props.data.approverId == null || props.data.approverId == "" ? "" : props.data.approverId);
    const [approverError,setApproverError] = useState("");

    const [showLoadingModal,setShowLoadingModal] = useState(false);
    const [isLoading,setLoading] = useState(false);

    const [remarks,setRemarks] = useState(props.data.remarks == null ? "" : props.data.remarks);
    const [internalNote,setInternalNote] = useState(props.data.internalNote == null ? "" : props.data.internalNote);

    const [isMaxLinesInRemarksReach,setMaxLinesInRemarksReach] = useState(false);


    let tmpTotal = 0;
    tmpItems.forEach(i => {
        tmpTotal += i.quantity * i.price;
    });
    let tmpDiscAmount = (Number(props.data.discount)/100)*tmpTotal;
    const [discount,setDiscount] = useState(props.data.discount);
    const [discountAmount,setDiscountAmount] = useState(tmpDiscAmount);
    const [totalAmount,setTotalAmount] = useState(tmpTotal-tmpDiscAmount);
    const [status,setStatus] = useState(props.data.status);
    const [pONumber,setPONumber] = useState(props.data.orderNumber);

    const [isFetchingInternalAttachments,setIsFetchingInternalAttachments] = useState(true);    
    const [pOCurrentAttachments,setPOCurrentAttachments] = useState([]);
    const [attachmentsIdToRemove,setAttachmentsIdToRemove] = useState([]);
    const [newAttachments,setNewAttachments] = useState([]);

    const [isFetchingExternalAttachments,setIsFetchingExternalAttachments] = useState(false);    
    const [pOCurrentAttachmentsExternal,setPOCurrentAttachmentsExternal] = useState([]);
    const [attachmentsIdToRemoveExternal,setAttachmentsIdToRemoveExternal] = useState([]);
    const [newAttachmentsExternal,setNewAttachmentsExternal] = useState([]);

    useEffect(() => {
        //add just the size of textarea based on the scrollHeight
        tmpItemsRef.forEach(i => {
            // let event = new Event('change');
            // i.current.dispatchEvent(event);

            if (i.current != null) {
                i.current.style.height = "1px";
                i.current.style.height = (25+i.current.scrollHeight)+"px";
            }
        });

        //add just the size of textarea based on the scrollHeight
        if (remarksRef.current != null) {
            remarksRef.current.style.height = "1px";
            remarksRef.current.style.height = (25+remarksRef.current.scrollHeight)+"px";
        }

        //add just the size of textarea based on the scrollHeight
        if (notesRef.current != null) {
            notesRef.current.style.height = "1px";
            notesRef.current.style.height = (25+notesRef.current.scrollHeight)+"px";
        }


    });

    useEffect(() => {
        setIsFetchingInternalAttachments(true);
        axios.get(`${SERVER}/po/attachments/${props.data.id}`)
            .then(response => {            
                setPOCurrentAttachments(response.data);
            })
            .catch(error => {

            })
            .finally(() => {
                setIsFetchingInternalAttachments(false);
            });

        setIsFetchingExternalAttachments(true);
            axios.get(`${SERVER}/po/externalattachments/${props.data.id}`)
                .then(response => {            
                    setPOCurrentAttachmentsExternal(response.data);
                })
                .catch(error => {
    
                })
                .finally(() => {
                    setIsFetchingExternalAttachments(false);
                });
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
        
        let tmpItems = JSON.parse(JSON.stringify(items));

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

     

        setItems(tmpItems);

        //Change the discount
        let total = 0;
        tmpItems.forEach(i => {
            total += itemTotal(i);
        });

        let rawDiscount = (Number(discount)/100)*total;
        let discAmount = numeral(rawDiscount).format('0,0.00');
        setDiscountAmount(discAmount);
        setTotalAmount(total-rawDiscount);

        validateApproverSelection(total,rawDiscount,currency);

    };

    const validateApproverSelection = (total, discAmount, currencyParam) => {
        let tmpCurrency = CURRENCY.filter(i => i.id == Number(currencyParam))[0];
        let approversThatMeetReq = getApproversThatMeetRequirements(context.state.approvers, total - discAmount, tmpCurrency.code);
        if (approversThatMeetReq.filter(i => i.id == context.state.approver).length == 0) {
            setApprover("");
        }
    }

    const onCurrencyChange = (e) => {
        setCurrency(e.currentTarget.value);
        let total = orderTotal();
        let discAmount = (Number(context.state.discount)/100)*total;
        validateApproverSelection(total,discAmount,e.currentTarget.value);
    }

    const itemTotal = (item) => {
        return item.quantity * item.price;
    };

    const orderTotal = () => {
        let total = 0;
        items.forEach(i => {
            total += itemTotal(i);
        });
        return total;
    };

    const removeItem = (e) => {
        let id = e.currentTarget.getAttribute('data-id');
        let r = items.filter(i => i.id != id);
        setItems(r);

        let total = 0;
        r.forEach(i => {
            total += itemTotal(i);
        });
        let discAmount = (Number(discount)/100)*total;
        setDiscountAmount(discAmount);
        setTotalAmount(total-discAmount);
    };

    const checkIfItemsAreValid = () => {
        let tmpR = JSON.parse(JSON.stringify(items));

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

        if (items.length == 1) {
            noErrors = false;
        }

        setItems(tmpR);

        return noErrors;
    };

    const changeTextAreaHeight = (e) => {
        e.currentTarget.style.height = "1px";
        e.currentTarget.style.height = (25+e.currentTarget.scrollHeight)+"px";
    }

    const onDiscountChange = (e) => {
        let total = orderTotal();
        let discAmount = 0;
        let rawDiscount = 0;
        if (Number(e.currentTarget.value) >= 0 && Number(e.currentTarget.value) <= 100) {
            setDiscount(e.currentTarget.value);  
            rawDiscount = (Number(e.currentTarget.value)/100)*total;
            discAmount = numeral(rawDiscount).format('0,0.00');
            setDiscountAmount(discAmount);
            setTotalAmount(total-rawDiscount);
        } else if (e.currentTarget.value == ".") {
            setDiscount(e.currentTarget.value);  
        }

        validateApproverSelection(total,rawDiscount,currency);

    };

    const onSaveDraftPO = (e) => {

        //prevent the user from creating more lines in remarks
        if (isMaxLinesInRemarksReach) {
            setFormHasError(true);
            return;
        }


        setShowLoadingModal(true);
        setRequestMessage("Saving PO as draft...");

        setRequestHasErrorMessage(false);
        setRequestErrorMessage("");
        
        let POPendingItems = [];
        for (let index = 0; index < items.length-1; index++) {
            POPendingItems.push({
                order: index, 
                name: items[index].name, 
                price: Number(items[index].price), 
                quantity: Number(items[index].quantity),
                total: Number(items[index].price) * Number(items[index].quantity)
            });                   
        }

        let tmpSupplier;
        if (supplier == "") {
                tmpSupplier = {
                    name: "",
                    address: ""
                }
        } else {
            tmpSupplier = context.state.suppliers.filter(i => i.id == Number(supplier))[0];
        }


        let tmpContactPerson;
        if (contactPerson == "") {
                tmpContactPerson = {
                    id: "",
                    firstName: "",
                    lastName: ""
                }
        } else {
                tmpContactPerson =tmpSupplier.contactPersons.filter(i => i.id == Number(contactPerson))[0];
        }
        
        let tmpApprover;
        if (approver == "") {
                tmpApprover = {
                    id: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    jobTitle: ""
                }
        } else {
            tmpApprover = context.state.approvers.filter(i => i.id == Number(approver))[0];
        }

        let tmpCurrency = CURRENCY.filter(i => i.id == Number(currency))[0];
        let totalLinesStringArray = getLinesCountOfItemsAndRemarks(remarksRef);

        let formData = new FormData();
        formData.append('id',props.data.id);
        //null ? "" prevent from update the field to null(string)
        formData.append('referenceNumber',referenceNumber == null ? "" : referenceNumber);
        formData.append('supplierId',supplier == "" ? "" : Number(supplier));
        formData.append('supplierName',tmpSupplier.name);
        formData.append('supplierAddress',tmpSupplier.address);
        formData.append('contactPersonId',tmpContactPerson.id == "" ? "" : Number(tmpContactPerson.id));
        formData.append('contactPersonname',`${tmpContactPerson.firstName} ${tmpContactPerson.lastName}`);
        formData.append('customerName',customer == null ? "" : customer);
        //Date format should be YYYY-MM-DD 
        formData.append('estimatedArrival',estDate == null ? "" : estDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((estDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(estDate.getDate()));
        formData.append('currency',tmpCurrency.symbol);
        formData.append('currencyCode',tmpCurrency.code);
        formData.append('approverId',tmpApprover.id == "" ? "" : Number(tmpApprover.id));
        formData.append('approverName',`${tmpApprover.firstName} ${tmpApprover.lastName}`);
        formData.append('approverEmail',tmpApprover.email);
        formData.append('approverJobTitle',tmpApprover.jobTitle);
        formData.append('remarks',remarks == null ? "" : remarks);
        formData.append('internalNote',internalNote == null ? "" : internalNote);
        formData.append('discount',Number(discount));
        formData.append('modifiedByName',`${context.state.user.firstName} ${context.state.user.lastName}`);
        formData.append('requestorEmail',context.state.user.email);
        formData.append('pOPendingItemsJsonString',JSON.stringify(POPendingItems));
        formData.append('textLineBreakCount',totalLinesStringArray);

        formData.append('sIOrBI',sIOrBI);
        formData.append('termsOfPayment',termsOfPayment);
        //Date format should be YYYY-MM-DD
        formData.append('invoiceDate',invoiceDate == null ? "" : invoiceDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((invoiceDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(invoiceDate.getDate()));

        attachmentsIdToRemove.forEach(i => {
            formData.append('attachmentIdsToRemove',i);
        });

        newAttachments.forEach(a => {
            formData.append('files', a.file);
        });

        attachmentsIdToRemoveExternal.forEach(i => {
            formData.append('externalAttachmentIdsToRemove',i);
        });

        newAttachmentsExternal.forEach(a => {
            formData.append('externalFiles', a.file);
        });

        //3 means draft
        formData.append('status',3);

        axios.put(`${SERVER}/po/draft`, formData, {headers: {
            'Content-Type': 'multipart/form-data',
            "Access-Control-Allow-Origin": "*"
          }})
            .then(result => {
                setRequestMessage("PO Draft saved!");
            })
            .catch(error => {
                setRequestMessage("Unable to save as draft");
                setRequestHasErrorMessage(true);
                if (error.response == undefined) {
                    setRequestErrorMessage(error.message);
                } else {
                    setRequestErrorMessage(error.response.data.error.message);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };
    
    const onSubmitPO = async (e) => {
       
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

        if (referenceNumber.trim() == "") {
            hasError = true;
            setReferenceNumberError("Reference number is empty");
        }

        if (supplier == "") {
            hasError = true;
            setSupplierError("No supplier selected");
        }

        if (contactPerson == "") {
            hasError = true;
            setContactPersonError("No contact persons selected");
        }

        if (customer == "") {
            hasError = true;
            setCustomerError("Customer is empty");
        }

        if (approver == "") {
            hasError = true;
            setApproverError("No approver selected");
        }

        if (items.length == 1) {
            hasError = true;
            setItemsError("No item");
        }

        if (!checkIfItemsAreValid()) {
            hasError = true;
        }

        if (termsOfPayment != "COD") {
            if (isNaN(termsOfPayment)) {
                hasError = true;
                setTermsOfPaymentError("Invalid");
            } else {
                if (Number(termsOfPayment) < 0) {
                    hasError = true;
                    setTermsOfPaymentError("Invalid");
                }   
            }
        } 

        setFormHasError(hasError);


        if (!hasError) {
            let totalLinesStringArray = getLinesCountOfItemsAndRemarks(remarksRef);

            setShowLoadingModal(true);
            setLoading(true);
            setRequestMessage("Updating PO...");

            setRequestHasErrorMessage(false);
            setRequestErrorMessage("");
 
            let POPendingItems = [];
            for (let index = 0; index < items.length-1; index++) {
                POPendingItems.push({
                    order: index, 
                    name: items[index].name, 
                    price: Number(items[index].price), 
                    quantity: Number(items[index].quantity)
                 });                   
            }

            let tmpSupplier = context.state.suppliers.filter(i => i.id == Number(supplier))[0];
            let tmpContactPerson = tmpSupplier.contactPersons.filter(i => i.id == Number(contactPerson))[0];
            let tmpApprover = context.state.approvers.filter(i => i.id == Number(approver))[0];
            let tmpCurrency = CURRENCY.filter(i => i.id == Number(currency))[0];
            let approversThatMeetReq = getApproversThatMeetRequirements(context.state.approvers, totalAmount, tmpCurrency.code);
            if (approversThatMeetReq.length == 0 && context.state.approvers.length != 0) {
                hasError = true;
            }

            let formData = new FormData();
            formData.append('id',props.data.id);
            formData.append('referenceNumber',referenceNumber);
            formData.append('supplierId',Number(supplier));
            formData.append('supplierName',tmpSupplier.name);
            formData.append('supplierAddress',tmpSupplier.address);
            formData.append('contactPersonId',Number(tmpContactPerson.id));
            formData.append('contactPersonname',`${tmpContactPerson.firstName} ${tmpContactPerson.lastName}`);
            formData.append('customerName',customer);
            //Date format should be YYYY-MM-DD 
            formData.append('estimatedArrival',estDate == null ? "" : estDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((estDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(estDate.getDate()));
            formData.append('currency',tmpCurrency.symbol);
            formData.append('currencyCode',tmpCurrency.code);
            formData.append('approverId',Number(tmpApprover.id));
            formData.append('approverName',`${tmpApprover.firstName} ${tmpApprover.lastName}`);
            formData.append('approverEmail',tmpApprover.email);
            formData.append('approverJobTitle',tmpApprover.jobTitle);
            formData.append('remarks',remarks == null ? "" : remarks);
            formData.append('internalNote',internalNote == null ? "" : internalNote);
            formData.append('discount',discount);
            formData.append('modifiedByName',`${context.state.user.firstName} ${context.state.user.lastName}`);
            formData.append('requestorEmail',context.state.user.email);
            formData.append('pOPendingItems', JSON.stringify(POPendingItems));
            formData.append('textLineBreakCount',totalLinesStringArray);
            //0 means pending
            formData.append('status',0);

            formData.append('sIOrBI',sIOrBI);
            formData.append('termsOfPayment',String(termsOfPayment));
            //Date format should be YYYY-MM-DD
            formData.append('invoiceDate',invoiceDate == null ? "" : invoiceDate.getFullYear()+'-'+addLeadingZeroIfOneDigit((invoiceDate.getMonth()+1))+'-'+addLeadingZeroIfOneDigit(invoiceDate.getDate()));

            attachmentsIdToRemove.forEach(i => {
                formData.append('attachmentIdsToRemove',i);
            });
    
            newAttachments.forEach(a => {
                formData.append('files', a.file);
            });

            attachmentsIdToRemoveExternal.forEach(i => {
                formData.append('externalAttachmentIdsToRemove',i);
            });
    
            newAttachmentsExternal.forEach(a => {
                formData.append('externalFiles', a.file);
            });


            let updatedPOResult = null;

            await axios.put(`${SERVER}/po`, formData, {headers: {
                    'Content-Type': 'multipart/form-data',
                    "Access-Control-Allow-Origin": "*"
                }})
                .then(result => {
                    updatedPOResult = result.data;
                    setRequestMessage("PO updated");
                })
                .catch(error => {
                    setRequestMessage("Unable to update PO");
                    setRequestHasErrorMessage(true);
                    if (error.response == undefined) {
                        setRequestErrorMessage(error.message);
                    } else {
                        setRequestErrorMessage(error.response.data.error.message);
                    }
                    setLoading(false);
                })
                .finally(() => {

                })
            
            if (updatedPOResult != null) {
                let POAttachments = await filesToAttachments(updatedPOResult.poAttachments);

                setRequestMessage("PO updated. Sending email to approver...");

                let emailBody = '';
                let subject = `Edited: PO No. ${updatedPOResult.orderNumber} - ${updatedPOResult.customerName} - For approval`;

                emailBody += getPOHTMLFormat(updatedPOResult);

                emailBody += `
                    <p style='width: 100%; height: 22px; text-align: left;'>&nbsp;<span style='font-family: arial, helvetica, sans-serif;'>Requested by: ${`${context.state.user.firstName} ${context.state.user.lastName}`} </span></p>
                `;

                emailBody += `
                <table style='border-collapse: collapse; width: 100%;' border='0'>
                    <tbody>
                        <tr>
                            <td style='width: 33.3333%; text-align: center;'><span style='font-family: arial, helvetica, sans-serif;'><a href='${APPROVER_SERVER}/l/reject/${updatedPOResult.guid}' target='_blank' rel='noopener' aria-invalid='true'>Reject</a></span></td>
                            <td style='width: 33.3333%;'>&nbsp;</td>
                            <td style='width: 33.3333%; text-align: center;'><span style='font-family: arial, helvetica, sans-serif;'><a href='${APPROVER_SERVER}/l/approve/${updatedPOResult.guid}' target='_blank' rel='noopener' aria-invalid='true'>Approve</a></span></td>
                        </tr>
                    </tbody>
                </table>
                <p><span style='color: #7e8c8d; font-size: 10pt; font-family: arial, helvetica, sans-serif;'><em>This is system generated message, please do not reply.</em></span></p>
                `;

                let requestObj = {
                    scopes: ["Mail.Send"]
                };

                let emailApprovalData = {
                    message: {
                        subject: subject,
                        body: {
                            contentType: "HTML",
                            content: emailBody
                        },
                        toRecipients: [
                            {
                                emailAddress: {
                                    address: updatedPOResult.approverEmail
                                }
                            }
                        ],
                        ccRecipients: [],
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

                // attachments: POAttachments

                myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {

                    setRequestMessage("Creating email...");

                    axios.post('https://graph.microsoft.com/v1.0/me/messages', emailBodyNoAttachment,  { headers: {
                                'Authorization': 'Bearer ' + tokenResponse.accessToken,
                        }})
                    .then(async (responseMsg) => {
                        let messageId = responseMsg.data.id;

                        setRequestMessage("PO updated and email draft created.");

                        let logData = {
                            POPendingId: updatedPOResult.id,
                            UserName: `${context.state.user.firstName} ${context.state.user.lastName}`,
                            Message: "Sent email approval to: " + updatedPOResult.approverEmail
                        };

                        for (let index = 0; index < POAttachments.length; index++) {
                            let item = POAttachments[index];
                            setRequestMessage(`(${index+1}/${POAttachments.length}) Uploading attachment (${item.name})....`);
                            // let fileItem = newAttachments.filter(i => i.name == item.name)[0];

                            let blob = new Blob([item.contentBytes], {type: "octet/stream"});

                            let fileItem = new File([blob], item.name);
                            
                            let MAX_CHUNK = 1024*1024*3;
    
                            //file is more than 3mb
                            if (fileItem.size > MAX_CHUNK) {

                                let uploadItem = {
                                    "AttachmentItem": {
                                      "attachmentType": "file",
                                      "name": fileItem.name,
                                      "size": fileItem.size
                                    }
                                  };

                                //create upload session
                                let uploadSession = await axios.post(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/createUploadSession`, uploadItem,  { headers: {
                                    'Authorization': 'Bearer ' + tokenResponse.accessToken,
                                }})

                                let url = uploadSession.data.uploadUrl;

                                let uploadCount = Math.ceil(fileItem.size / MAX_CHUNK);
                                let start = 0;
                                let end = MAX_CHUNK;
    
                                for (let index2 = 0; index2 < uploadCount; index2++) {
                                    let d = fileItem.slice(start, end);
                                    await axios.put(url, d, {
                                        headers: {
                                            "Content-Type": "application/octet-stream",
                                            "Content-Range": `bytes ${start}-${end-1}/${fileItem.size}`
                                        }
                                    });
                                    start = end;
                                    end = Math.min(start+MAX_CHUNK, fileItem.size);
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
                    .catch(error => {
                        setRequestHasErrorMessage(true);
                        setRequestMessage("Failed to send email. Please try to send it again");
                        if (error.response == undefined) {
                            setRequestErrorMessage(error.message);
                        } else {
                            setRequestErrorMessage(error.response.data.error.message);
                        }
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            
                }).catch(function (error) {
                    setRequestHasErrorMessage(true);
                    setRequestMessage("Unable to send email. Failed to get token. Please try to send it again");
                    if (error.response == undefined) {
                        setRequestErrorMessage(error.message);
                    } else {
                        setRequestErrorMessage(error.response.data.error.message);
                    }
                    setLoading(false);
                });

            }
        }

    };

    const checkRemarksMaxLines = () => {
        if (remarksRef.current.clientHeight >= REMARKS_MAX_LINE) {
            setMaxLinesInRemarksReach(true);
        } else {
            setMaxLinesInRemarksReach(false);
        }
    }

    const addAttachments = (e, list, update) => {
        //get the file
        let file = e.currentTarget.files[0];
        
        //create new temporary var
        let tmp = [];
        //populate the tmp var
        list.forEach(i => {
            let newFile = new File([i.file], i.file.name);
            tmp.push({ file: newFile, name: i.name });
        });

        //push the new item
        let newFile = new File([file], file.name);
        tmp.push({file: newFile, name: file.name});

        //update the state
        update(tmp);

        //so the file name will not appear in the input file
        e.currentTarget.value = "";
    }

    const removeAttachment = (id, currentList, listOfIdsToRemove, updateListOfIdsToRemove, updateCurrentList) => {
        let tmp = JSON.parse(JSON.stringify(currentList));
        tmp = tmp.filter((v) => v.id != id);

        let tmp2 = JSON.parse(JSON.stringify(listOfIdsToRemove));
        tmp2.push(id);

        updateListOfIdsToRemove(tmp2);
        updateCurrentList(tmp);
    }

    const removeNewAttachment = (index, newList, updateNewList) => {
        //create new temporary var
        let tmp = [];
        //filter the item removing the selected attachment then populate the tmp var
        newList.filter((v,itemIndex) => itemIndex != index).forEach(i => {

            let newFile = new File([i.file], i.name);

            tmp.push({ file: newFile, name: i.name });
        });

        //update the state
        updateNewList(tmp);
    }

    const getTotalFilesCountAndSize = (currentList, newList) => {
        let total = 0;
        let count = 0;

        currentList.forEach(i => {
            total += i.size;
            count += 1;
        });

        newList.forEach(i => {
            total += i.file.size;
            count += 1;
        });

        return {
            total: Number.parseFloat((total/1024)/1024).toFixed(2),
            count
        };
    }

    const onPreviewClick = () => {

        setPreviewPDFisLoading(true);

        let POPendingItems = [];
        for (let index = 0; index < items.length-1; index++) {
            POPendingItems.push({name: items[index].name, price: Number(items[index].price), quantity: Number(items[index].quantity) });                   
        }

        let totalLinesStringArray = getLinesCountOfItemsAndRemarks(remarksRef);

        let tmpSupplier;
        if (supplier == "") {
                tmpSupplier = {
                    name: "",
                    address: ""
                }
        } else {
            tmpSupplier = context.state.suppliers.filter(i => i.id == Number(supplier))[0];
        }

        let tmpContactPerson;
        if (contactPerson == "") {
                tmpContactPerson = {
                    id: "",
                    firstName: "",
                    lastName: ""
                }
        } else {
                tmpContactPerson =tmpSupplier.contactPersons.filter(i => i.id == Number(contactPerson))[0];
        }
        
        let tmpCurrency = CURRENCY.filter(i => i.id == Number(currency))[0];

        let tmpApprover;
        if (approver == "") {
                tmpApprover = {
                    id: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    jobTitle: ""
                }
        } else {
            tmpApprover = context.state.approvers.filter(i => i.id == Number(approver))[0];
        }

        let data = {
            id: String(props.data.orderNumber),
            referenceNumber: referenceNumber == null ? "" : referenceNumber,
            supplierName: tmpSupplier.name,
            supplierAddress: tmpSupplier.address,
            contactPersonName: `${tmpContactPerson.firstName} ${tmpContactPerson.lastName}`,
            customerName: customer == null ? "" : customer,
            estimatedArrival: jsDateToSqlDate(estDate),
            currency: tmpCurrency.symbol,
            approverName: `${tmpApprover.firstName} ${tmpApprover.lastName}`,
            approverJobTitle: tmpApprover.jobTitle,
            approverId: Number(tmpApprover.id),
            discount: Number(discount),
            remarks: remarks == null ? "" : remarks,
            pOPendingItemsJsonString: JSON.stringify(POPendingItems),
            textLineBreakCount: totalLinesStringArray,
            approvedOn: null,
            orderNumber: props.data.orderNumber,

            invoiceDate: jsDateToSqlDate(context.state.invoiceDate),
            termsOfPayment: termsOfPayment,
            sIOrBI: sIOrBI
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
                <h2>{attachmentProps.title} ({getTotalFilesCountAndSize(attachmentProps.currentList, attachmentProps.newList).count} {getTotalFilesCountAndSize(attachmentProps.currentList, attachmentProps.newList).count <= 1 ? `File` : `Files`}, {getTotalFilesCountAndSize(attachmentProps.currentList, attachmentProps.newList).total}MB)</h2>
            </div>
            <div className={styles.hr}></div>
            {
                attachmentProps.isLoading ?
                <div>Fetching attachments</div>
                :
                <div>
                    {
                        attachmentProps.currentList.map((a,i) => 
                            <div className={styles.row} style={{alignItems: 'center', marginBottom: '10px'}} key={a.id}>
                                <div className={styles.smallX} style={{marginRight: '15px'}} onClick={e => removeAttachment(a.id, attachmentProps.currentList, attachmentProps.listOfIdsToRemove, attachmentProps.updateListOfIdsToRemove, attachmentProps.updateCurrentList )}>X</div>
                                {a.name}
                            </div>     
                        )
                    }
                    {
                        attachmentProps.newList.map((a,i) => 
                            <div className={styles.row} style={{alignItems: 'center', marginBottom: '10px'}} key={i}>
                                <div className={styles.smallX} style={{marginRight: '15px'}} onClick={e => removeNewAttachment(i, attachmentProps.newList, attachmentProps.updataNewAttachments ) }>X</div>
                                {a.name}
                            </div>     
                        )
                    }
                    
                    <input id={attachmentProps.id} type="file" onChange={e => addAttachments(e, attachmentProps.newList,  attachmentProps.updataNewAttachments) } style={{display: 'none'}} />
                    <label className={styles.uploadLabel} htmlFor={attachmentProps.id} >Select the file you want to upload</label>
                </div>
            }

            <br/>
            <br/>
            {/* {
                Number(getTotalFilesCountAndSize(attachmentProps.currentList, attachmentProps.newList).total) > UPLOAD_MAX_FILE_SIZES_MB &&
                <div className={styles.error}>You exceed the maximun file size limit</div>
            } */}
            <i>Max of 10 MB total attachments.</i>
        </div>
    }

    let tmpCurrency = CURRENCY.filter(i => i.id == Number(currency))[0];
    let approversThatMeetReq = getApproversThatMeetRequirements(context.state.approvers, totalAmount, tmpCurrency.code );

    return <div className={styles.editPO}>
        <div className={styles.row} style={{alignItems: 'center'}}>
            <h2>Edit Purchase Order</h2>
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
        {
            displayRequestMessage == "success" &&
            <div className={`${styles.success} ${styles.successBorder}`}>
                {requestMessage}
            </div>
        }
        {
            displayRequestMessage == "error" &&
            <div className={`${styles.error} ${styles.errorBorder}`}>
                Unable to process your request right try again later
            </div>
        }
        <div className={styles.rowField}>
            <div>Supplier</div>
            <div>
                    {
                        context.state.isSuppliersLoading ?
                        <p>Fetching suppliers...</p>
                        :
                        <select value={supplier} onChange={e => {setSupplier(e.currentTarget.value); setContactPerson(""); } } >
                            <option value=""></option>
                            {
                                context.state.suppliers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                            }
                        </select>
                    }
            </div>
            <div>PO #</div>
            <div>
                {pONumber}
            </div>
        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div className={styles.error}>{supplierError}</div>
            <div></div>
            <div></div>
        </div>
        <div className={styles.rowField}>
            <div>Address</div>
            <div>
                {
                    supplier != "" &&
                    context.state.suppliers.filter(i => i.id == Number(supplier))[0].address
                }
            </div>
            <div>Reference #</div>
            <div>
                <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.currentTarget.value)} />
            </div>
        </div>
        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div></div>
            <div></div>
            <div className={styles.error}>{referenceNumberError}</div>
        </div>

        <div className={styles.rowField}>
            <div>Contact Person</div>
            <div>
                <select value={contactPerson} onChange={e => setContactPerson(e.currentTarget.value) } >
                    <option value=""></option>
                    {
                        supplier != "" &&
                        context.state.suppliers.filter(i => i.id == Number(supplier))[0].contactPersons.map(i => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)
                    }
                </select>
            </div>

            <div>Expected Delivery</div>
            <div>
                <div>
                     <DatePicker
                        selected={estDate}
                        onChange={value => setEstDate(value)}
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
            <div>S.I# or B.I#</div>
            <div>
                <input type="text" value={sIOrBI} onChange={e => setSIOrBI(e.currentTarget.value)} disabled />
            </div>
            <div>Terms of Payment</div>
            <div>
                <input placeholder="Days" type="text" value={termsOfPayment} onChange={e =>  setTermsOfPayment(e.currentTarget.value) } />
            </div>
        </div>

        <div className={styles.rowFieldForMessage}>
            <div></div>
            <div className={styles.error}></div>
            <div></div>
            <div className={styles.error}>{termsOfPaymentError}</div>
        </div>

        <div className={styles.rowField}>
            <div>Invoice Date</div>
            <div>
                 <div>
                    <DatePicker
                        selected={invoiceDate}
                        onChange={value => setInvoiceDate(value)}
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
            <div>Customer</div>
            <div>
                <input type="text" value={customer} onChange={e => setCustomer(e.currentTarget.value)} />
            </div>
                
            <div>Currency</div>
            <div>
                <select value={currency} onChange={onCurrencyChange} >
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
        {/* <h3>Items</h3>
        <div className={styles.hr}></div> */}

        <div className={styles.row}>
            <div style={{width: '60px'}} className={`${styles.tableHeaderRowForm}`}>Quantity</div>
            <div style={{flexGrow: 1}} className={`${styles.tableHeaderRowForm}`}>Description</div>
            <div style={{width: '110px'}} className={`${styles.tableHeaderRowForm}`}>Unit Price</div>
            <div style={{width: '130px', textAlign: 'right'}} className={`${styles.tableHeaderRowForm}`}>Amount</div>
            <div style={{width: '40px'}} className={`${styles.tableHeaderRowForm}`}></div>
        </div>
        {
            items.map((i,index) =>
                <div className={styles.row} key={i.id}>
                    <div style={{width: '60px'}} className={`${styles.tableRowForm}`}>
                        <input className={styles.numbers} type="text" value={i.quantity} style={{textAlign: 'right'}} onChange={e => (Number(e.currentTarget.value) < MAX_QTY && Number(e.currentTarget.value) >= 0) && changeOrderItemValue(i.id,'quantity', e.currentTarget.value) } />
                        <div className={styles.error}>{i.quantityError}</div>
                    </div>
                    <div style={{flexGrow: 1}} className={`${styles.tableRowForm}`}>
                        {/* <input type="text" value={i.name} onChange={e => changeOrderItemValue(i.id,'name',e.currentTarget.value) }/> */}
                        <textarea className="textarea" ref={tmpItemsRef[index]} onChange={ e =>{  changeTextAreaHeight(e); changeOrderItemValue(i.id,'name',e.currentTarget.value); }} value={i.name} style={{overflow: "hidden", resize: "none", display: "block", width: "615px",}} wrap="hard" rows={1} cols={5} ></textarea>
                        <div className={styles.error}>{i.nameError}</div>
                    </div>
                    <div style={{width: '110px'}} className={`${styles.tableRowForm}`}>
                        <input className={styles.numbers} type="text" value={i.price} style={{textAlign: 'right'}} onChange={e => changeOrderItemValue(i.id,'price',e.currentTarget.value) }/>
                        <div className={styles.error}>{i.priceError}</div>
                    </div>
                    <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                        {
                            items.length-1 != index &&
                            numeral(Number( itemTotal(i) )).format('0,0.00')
                        }
                    </div>
                    <div style={{width: '40px'}} className={`${styles.tableRowForm}`}>
                        {
                            items.length-1 != index &&
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
            <div style={{width: '40px'}} className={`${styles.tableRowForm}`}></div>
        </div>
        <div className={styles.row} style={{justifyContent: 'flex-end', alignItems: 'center'}}>
            <div>
                Discount (%)
            </div>
            <div style={{width: '110px'}} className={`${styles.tableRowForm}`}>
                <input className={`${styles.numbers}`} type="text" value={discount} onChange={onDiscountChange} />
            </div>
            <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                -{numeral(discountAmount).format('0,0.00')}
            </div>
            <div style={{width: '40px'}} className={`${styles.tableRowForm}`}></div>
        </div>
        <div className={styles.row} style={{justifyContent: 'flex-end', alignItems: 'center'}}>
            <div>
                <strong>Total Amount</strong>
            </div>
            <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.withBorderTop} ${styles.numbers}`}>
                {tmpCurrency.symbol}{numeral(totalAmount).format('0,0.00')}
            </div>
            <div style={{width: '40px'}} className={`${styles.tableRowForm}`}></div>
        </div>


        <div className={styles.error}>
            {itemsError}
        </div>
        <br/>

        <div className={styles.column}>
            <label>Remarks</label>
            <textarea className="textarea" ref={remarksRef} style={{overflow: "hidden", resize: "none", display: "block", width: "1000px",}} onChange={e => {checkRemarksMaxLines(); changeTextAreaHeight(e); setRemarks(e.currentTarget.value);  } } value={remarks}>
            </textarea>
        </div>
        {
            isMaxLinesInRemarksReach &&
            <p className={styles.error}>You reached the maximun lines of remarks, please remove some lines.<br/>This will cause an overlap in generating the PDF of this PO.</p>
        }
        <br/>
        <div className={styles.column}>
            <label>Internal Note</label>
            <textarea className="textarea" ref={notesRef} style={{overflow: "hidden", resize: "none", display: "block", width: "1000px",}}  onChange={e => { changeTextAreaHeight(e); setInternalNote(e.currentTarget.value); } } value={internalNote}>
            </textarea>
        </div>
        <br/>
        <AttachmentsComponent title={"Internal Attachments"} id="internalFile" currentList={pOCurrentAttachments} newList={newAttachments} updataNewAttachments={setNewAttachments} listOfIdsToRemove={attachmentsIdToRemove} updateListOfIdsToRemove={setAttachmentsIdToRemove} updateCurrentList={setPOCurrentAttachments} isLoading={isFetchingInternalAttachments} />
        <br/>
        <br/>
        <br/>
        <AttachmentsComponent title={"External Attachments"} id="externalFile"  currentList={pOCurrentAttachmentsExternal} newList={newAttachmentsExternal} updataNewAttachments={setNewAttachmentsExternal} listOfIdsToRemove={attachmentsIdToRemoveExternal} updateListOfIdsToRemove={setAttachmentsIdToRemoveExternal} updateCurrentList={setPOCurrentAttachmentsExternal} isLoading={isFetchingExternalAttachments} />
        <br/>
        <br/>
        <br/>
        {
            displayRequestMessage == "success" &&
            <div className={`${styles.success} ${styles.successBorder}`}>
                {requestMessage}
            </div>
        }
        {
            displayRequestMessage == "error" &&
            <div className={`${styles.error} ${styles.errorBorder}`}>
                Unable to process your request right try again later
            </div>
        }
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
                <button className={styles.buttonSecondary} onClick={e => { context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.ITEM}) }}>Discard changes</button>
                <div className={styles.row} style={{marginLeft: 'auto', alignItems: 'center'}}>
                    <button className={styles.buttonSecondary} onClick={onSaveDraftPO}>Save as draft</button>
                    <div className={styles.vr}></div>
                    <label style={{marginRight: '5px'}}>Send this to</label>

                    <div className={styles.column}>
                        <select style={{flexGrow: 1}} value={approver} onChange={e => setApprover(e.currentTarget.value) } >
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
        <div style={{textAlign: 'right'}} className={styles.error}>{approverError}
        </div>        
        <br/>
        {
            showPDFPreview &&
            <PreviewPDF pdf={pdf} pdfPagesNumbering={pdfPagesNumbering} close={() => { setShowPDFPreview(false); }} />
        }
        {
            showLoadingModal &&
            <LoadingModal title={"Creating PO"} message={requestMessage} hasError={requestHasError} errorMessage={requestErrorMessage} done={!isLoading} buttonText={"OK"} onClick={e => { 
                setShowLoadingModal(false); 
                if (!requestHasError) {
                    props.loadData();
                    context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.LIST});
                }
            } } />
        }
    </div>;

};

export default EditPO;
