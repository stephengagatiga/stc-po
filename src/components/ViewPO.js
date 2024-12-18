import * as React from 'react';
import styles from './StcPo.module.scss';
import {useState,useRef,useEffect,useContext} from "react";
import numeral from 'numeral';
import axios from "axios";
import { SERVER, POStatus, PO_PENDING_VIEWS, ACCESS_RIGHTS, myMSALObj } from '../utils/constant';
import { getContactPersonFirstName, getPOHTMLFormat, jsDateToSqlDate } from '../utils/utils';
import * as moment from 'moment';
import {AppContext} from './StcPo';
import PreviewPDF from './PreviewPDF';
import { pdfjs } from 'react-pdf';
import EmailModal from './EmailModal';

import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const ViewPO = (props) => {

    const context = useContext(AppContext);
    const [currentPO,setCurrentPO] = useState({poPendingItems: []});
    const [generatePDFOnProgress,setGeneratePDFOnProgress] = useState(false);
    const [auditTrailLogMessage,setAuditTrailLogMessage] = useState("");
    const [logMessageHasError,setLogMessageHasError] = useState(false);
    const [logMessageError,setLogMessageError] = useState("");
    const [auditTrailIsLoading,setAuditTrailIsLoading] = useState(false);
    const [auditTrails,setAuditTrails] = useState([]);
    const [isFetchingAuditTrails,setIsFetchingAuditTrails] = useState(true);
    const [fetchingAuditTrailsError,setFetchingAuditTrailsError] = useState("");

    const [showSIorBIModal,setShowSIorBIModal] = useState(false);
    const [sIorBISentRequest,setSIorBISentRequest] = useState(false);
    const [sIorBIDeliveryError,setSIorBIDeliveryError] = useState('');

    const [showReceivedModal,setShowReceivedModal] = useState(false);
    const [receivedDeliverySentRequest,setReceivedDeliverySentRequest] = useState(false);

    const [showCancellationModal,setShowCancellationModal] = useState(false);
    const [cancellationSentRequest,setCancellationSentRequest] = useState(false);

    const [showEmailUpdatesModal,setShowEmailUpdatesModal] = useState(false);
    const [emailUpdatesSentRequest,setEmailUpdatesSentRequest] = useState(false);

    const [reason,setReason] = useState("");
    const [reasonError,setReasonError] = useState("");

    const [approver,setApprover] = useState("");
    const [approverError,setApproverError] = useState("");

    const [showSendToSupplierModal,setShowSendToSupplierModal] = useState(false);

    const [isFetchingAttachments,setIsFetchingAttachments] = useState(false);
    const [pOCurrentAttachments,setPOCurrentAttachments] = useState([]);

    const [isFetchingExternalAttachments,setIsFetchingExternalAttachments] = useState(false);
    const [pOCurrentExternalAttachments,setPOCurrentExternalAttachments] = useState([]);

    const [showPDFPreview,setShowPDFPreview] = useState(false);
    const [pdf,setPdf] = useState(null);
    const [pdfPagesNumbering,setPdfPagesNumbering] = useState([]);
    const [previewPDFisLoading,setPreviewPDFisLoading] = useState(false);

    const [TOs,setTOs] = useState('');
    const [sendEmailUpdatesError,setSendEmailUpdatesError] = useState('');

    const [completedDeliveryTOs,setCompletedDeliveryTOs] = useState('');
    const [sendCompleteDeliveryError,setSendCompleteDeliveryError] = useState('');

    const [sIOrBI,setSIOrBI] = useState("");
    const [invoiceDate,setInvoiceDate] = useState(null);

    useEffect(() => {
        setCurrentPO(props.selectedPO);
        setIsFetchingAuditTrails(true);
        axios.get(`${SERVER}/po/${props.selectedPO.id}/audittrail`)
            .then(response => {
                setFetchingAuditTrailsError("");
                setAuditTrails(response.data);
            })
            .catch(error => {
                setFetchingAuditTrailsError("Unable to get the audit trails for this PO");
                console.log(error);
            })
            .finally(() => {
                setIsFetchingAuditTrails(false);
            })

        setIsFetchingAttachments(true);
        axios.get(`${SERVER}/po/attachments/${props.selectedPO.id}`)
            .then(response => {
                setPOCurrentAttachments(response.data);
            })
            .catch(error => {

            })
            .finally(() => {
                setIsFetchingAttachments(false);
            });

        setIsFetchingExternalAttachments(true);
        axios.get(`${SERVER}/po/externalattachments/${props.selectedPO.id}`)
            .then(response => {
                setPOCurrentExternalAttachments(response.data);
            })
            .catch(error => {

            })
            .finally(() => {
                setIsFetchingExternalAttachments(false);
            });

    }, []);

    const getTotalFilesCountAndSize = (list) => {
        let total = 0;
        let count = 0;
        list.forEach(i => {
            total += i.size;
            count += 1;
        });

        return {
            total: Number.parseFloat((total/1024)/1024).toFixed(2),
            count
        };
    };

    const onViewPdfClick = (e) => {
        setGeneratePDFOnProgress(true);

        axios({
            url: `${SERVER}/po/pdf/${currentPO.id}`, //your url
            method: 'GET',
            responseType: 'blob', // important
            })
            .then(response => {

                let fileName = `PO-${currentPO.orderNumber}.pdf`;

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', fileName); //or any other extension
                document.body.appendChild(link);
                link.click();
                
                setGeneratePDFOnProgress(false);        
                // window.open(`${SERVER}/POPdf/${fileName}`, '_blank');

            })
            .catch(error => {
                setGeneratePDFOnProgress(false);        
                console.log(error);
            });

    };

    const onAddAuditTrailClick = (e) => {

        let hasError = false;
        if (auditTrailLogMessage.trim() == "") {
            hasError = true;
            setLogMessageError("Please input your message");
        }

        setLogMessageHasError(hasError);

        if (!hasError) {
            setAuditTrailIsLoading(true);

            let data = {
                POPendingId: currentPO.id,
                UserName: `${context.state.user.firstName} ${context.state.user.lastName}`,
                Message: auditTrailLogMessage
            };

            addAuditLog(data);
        }

    };

    const addAuditLog = (data, list) => {
        axios.post(`${SERVER}/po/audittrail`, data, { headers: {"Access-Control-Allow-Origin": "*"} })
        .then(response => {

            let tmp;

            if (list == undefined || list == null) {
                tmp = JSON.parse(JSON.stringify(auditTrails));
            } else {
                tmp = JSON.parse(JSON.stringify(list));
            } 
            
            tmp.unshift(response.data);
            setAuditTrails(tmp);
            setAuditTrailLogMessage("");
            
        })
        .catch(error => {
            setLogMessageError("Unable to send your request right now");
            setLogMessageHasError(true);
        })
        .finally(() => {
            setAuditTrailIsLoading(false);
        });
    }

    const onYesReceivedDeliveryClick = (e) => {

        setReceivedDeliverySentRequest(true);
        setSendCompleteDeliveryError('');

        let cPo = {...currentPO};
        cPo.siOrBI = sIOrBI;
        cPo.invoiceDate = invoiceDate;

        let emailBody = '';
        let subject = `PO No. ${currentPO.orderNumber} ${currentPO.supplierName == null ? '' : currentPO.supplierName}, ${currentPO.customerName == null ? '' : currentPO.customerName} - Completed Delivery`;

        emailBody += `
            <p class=MsoNormal>Completed Delivery!<o:p></o:p></p>
            <p>&nbsp;</p>
        `;

        emailBody += getPOHTMLFormat(cPo);

        
        emailBody += `
            <p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal><b>Audit trail logs<o:p></o:p></b></p><ul style='margin-top:0cm' type=disc>
        `;


        auditTrails.forEach(l => {
            emailBody += `
            <li class=MsoListParagraph style='margin-left:0cm;mso-list:l0 level1 lfo1'>
                        <span style='color:#7F7F7F;mso-style-textfill-fill-color:#7F7F7F;mso-style-textfill-fill-alpha:100.0%'>${l.userName} &#8211; ${moment.parseZone(l.dateAdded).format('MM/DD/YYYY hh:mm a')}</span>
                        <br>
                        ${l.message}
                        <br>
                        <o:p></o:p>
                    </li>
            
            `;
        });


        emailBody += `
        </ul><p class=MsoNormal><o:p>&nbsp;</o:p></p>
        `;

        emailBody += `
        <p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal></p></div></body></html>
        `;

        let emailData = {
            message: {
              subject: subject,
              body: {
                contentType: "HTML",
                content: emailBody
              },
              toRecipients: [],
              ccRecipients: [],
            }
        };


        let tmpTOs = [];
        context.state.sendUpdatesTOs.forEach(v => {
            tmpTOs.push( {
                emailAddress: {
                  address: v
                }
              });
        });

        completedDeliveryTOs.split(';').forEach(value => {
            if (value.trim() != "") {
              tmpTOs.push( {
                emailAddress: {
                  address: value
                }
              });
            }
          });

        emailData.message.toRecipients = tmpTOs;
        

        let requestObj = {
            scopes: ["Mail.Send"]
        };
        
        
        let completedDeliveryData = {
            pOId: currentPO.id,
            statusType: "RECEIVED",
            requestor: `${context.state.user.firstName} ${context.state.user.lastName}`,
            approverName: "",
            approverEmail: "",
            message: "",
            sIOrBI: sIOrBI,
            invoiceDate: jsDateToSqlDate(invoiceDate)
        };


        axios.post(`${SERVER}/po/status`, completedDeliveryData, { headers: {"Access-Control-Allow-Origin": "*"} })
            .then(completedDeliveryResponse => {


                //update the log
                let tmpAuditTrails = JSON.parse(JSON.stringify(auditTrails));
                tmpAuditTrails.unshift(completedDeliveryResponse.data);
                setAuditTrails(tmpAuditTrails);

                //update the item
                let po = JSON.parse(JSON.stringify(currentPO));
                po.receivedOn = completedDeliveryResponse.data.dateAdded;
                po.status = POStatus.indexOf("Received");
                po.siOrBI = sIOrBI;
                po.invoiceDate = invoiceDate;
                setCurrentPO(po);

                //convert the list
                let tmpList = JSON.parse(JSON.stringify(props.pOList));
                //remove the old item
                tmpList = tmpList.filter(i => i.id != currentPO.id);
                //add the updated item
                tmpList.unshift(po);
                //update the list
                props.setPOList(tmpList);
                props.updateItemInPOAllList(po);


                myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {

                    axios.post('https://graph.microsoft.com/v1.0/me/sendMail', emailData,  { headers: {
                            'Authorization': 'Bearer ' + tokenResponse.accessToken,
                    }})
                    .then(response => {
                        setShowReceivedModal(false);
        
                        let r = "";
                        emailData.message.toRecipients.forEach(v => {
                            if (r == "") {
                                r += v.emailAddress.address;
                            } else {
                                r += ";"+v.emailAddress.address;
                            }
                        });
        
        
                        let logData = {
                            POPendingId: currentPO.id,
                            UserName: `${context.state.user.firstName} ${context.state.user.lastName}`,
                            Message: "Sent completed delivery email updates to: " + r
                        };
            
                        addAuditLog(logData, tmpAuditTrails);
        
                    })
                    .catch(error => {
                        setSendCompleteDeliveryError("Error sending email updates, please try sending it again by clicking Send Email Updates");
                    })
                    .finally(() => {
                        setReceivedDeliverySentRequest(false);
                    });
          
              }).catch(function (error) {
                  console.log(error);
              })


            })
            .catch(error => {

            })
            .finally(() => {
                setReceivedDeliverySentRequest(false);
                setShowReceivedModal(false);
            });
    };

    const onYesUpdateSIorBIClick = (e) => {

        setSIorBISentRequest(true);
        setSIorBIDeliveryError('');
   
        let completedDeliveryData = {
            pOId: currentPO.id,
            statusType: "RECEIVED",
            requestor: `${context.state.user.firstName} ${context.state.user.lastName}`,
            sIOrBI: sIOrBI,
            invoiceDate: jsDateToSqlDate(invoiceDate)
        };

        axios.post(`${SERVER}/po/siorbi`, completedDeliveryData, { headers: {"Access-Control-Allow-Origin": "*"} })
            .then(completedDeliveryResponse => {

                //update the log
                let tmpAuditTrails = JSON.parse(JSON.stringify(auditTrails));
                tmpAuditTrails.unshift(completedDeliveryResponse.data);
                setAuditTrails(tmpAuditTrails);

                //update the item
                let po = JSON.parse(JSON.stringify(currentPO));
                po.siOrBI = sIOrBI;
                po.invoiceDate = invoiceDate;
                setCurrentPO(po);

                //convert the list
                let tmpList = JSON.parse(JSON.stringify(props.pOList));
                //remove the old item
                tmpList = tmpList.filter(i => i.id != currentPO.id);
                //add the updated item
                tmpList.unshift(po);
                //update the list
                props.setPOList(tmpList);
                props.updateItemInPOAllList(po);

            })
            .catch(error => {
                setSIorBIDeliveryError("Error updating S.I.# or B.I.#");
            })
            .finally(() => {
                setSIorBISentRequest(false);
                setShowSIorBIModal(false);
            });
    };

    const onYesCancellationClick = async (e) => {
        let hasError = false;

        setReasonError("");
        if (reason.trim() == '') {
            setReasonError("Please include your reason why you need to cancel this");
            hasError = true;
        }

        setApproverError("");
        if (approver == "") {
            setApproverError("Please choose the approver");
            hasError = true;
        }

        if (!hasError) {
            setCancellationSentRequest(true);
            let a = context.state.approvers.filter(a => a.id == approver)[0];
            let data = {
                pOId: currentPO.id,
                statusType: "CANCEL",
                requestor: `${context.state.user.firstName} ${context.state.user.lastName}`,
                approverName: `${a.firstName} ${a.lastName}`,
                approverEmail: a.email,
                message: reason
            };

            let emailBody = '';
            let subject = `PO No. ${currentPO.orderNumber} ${currentPO.supplierName == null ? '' : currentPO.supplierName}, ${currentPO.customerName == null ? '' : currentPO.customerName} - Cancellation Request`;
    
            emailBody += `
                <p class=MsoNormal>Reason: ${reason}<o:p></o:p></p>
                <p>&nbsp;</p>
            `;
    
            emailBody += getPOHTMLFormat(currentPO);
            
            let requestObj = {
                scopes: ["Mail.Send"]
            };
            
            let token = await myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {
                return tokenResponse.accessToken;
            }).catch(function (error) {
                return null;
            })

            if (token == null) {
                setReasonError("Unexpected error please try to cancel again.");
                return false;
            }

            let response = await axios.post(`${SERVER}/po/status`, data, { headers: {"Access-Control-Allow-Origin": "*"} })
            .then(response => {
                return response;
            })
            .catch(error => {
                return null;
            })
            .finally(() => {

            });

            if (response == null) {
                setReasonError("Unexpected error please try to cancel again.");
                return false;
            }

            //update the log
            let tmp = JSON.parse(JSON.stringify(auditTrails));
            tmp.unshift(response.data.log);
            setAuditTrails(tmp);

            //update the item
            let po = JSON.parse(JSON.stringify(currentPO));
            po.status = POStatus.indexOf("For Cancellation");
            setCurrentPO(po);

            //convert the list
            let tmpList = JSON.parse(JSON.stringify(props.pOList));
            //remove the old item
            tmpList = tmpList.filter(i => i.id != currentPO.id);
            //add the updated item
            tmpList.unshift(po);
            //update the list
            props.setPOList(tmpList);
            props.updateItemInPOAllList(po);


            emailBody += `<p>&nbsp;</p>
            <table style='border-collapse: collapse; width: 100%;' border='0'>
            <tbody>
            <tr>
            <td style='width: 33.3333%; text-align: center;'><span style='font-family: arial, helvetica, sans-serif;'><a href='${SERVER}/l/cancel/reject/${response.data.link.poGuid}' target='_blank' rel='noopener' aria-invalid='true'>Reject</a></span></td>
            <td style='width: 33.3333%;'>&nbsp;</td>
            <td style='width: 33.3333%; text-align: center;'><span style='font-family: arial, helvetica, sans-serif;'><a href='${SERVER}/l/cancel/approve/${response.data.link.poGuid}' target='_blank' rel='noopener' aria-invalid='true'>Approve</a></span></td>
            </tr>
            </tbody>
            </table>
            </body>
            </html>`;


            let emailData = {
                message: {
                  subject: subject,
                  body: {
                    contentType: "HTML",
                    content: emailBody
                  },
                  toRecipients: [
                    {
                        emailAddress: {
                            address: a.email
                        }
                    }
                  ],
                  ccRecipients: [],
                }
            };

            axios.post('https://graph.microsoft.com/v1.0/me/sendMail', emailData,  { headers: {
                    'Authorization': 'Bearer ' + token,
            }})
            .then(response => {
                setCancellationSentRequest(false);
                setShowCancellationModal(false);
            })
            .catch(error => {
                setReasonError("Unexpected error please try to cancel again.");
            })
            .finally(() => {
                
            });

        }


    };

    const onPreviewClick = () => {

        setPreviewPDFisLoading(true);
   
        let data = {
            id: String(currentPO.orderNumber),
            referenceNumber: currentPO.referenceNumber,
            supplierName: currentPO.supplierName,
            supplierAddress: currentPO.supplierAddress,
            contactPersonName: currentPO.contactPersonName,
            customerName: currentPO.customerName,
            estimatedArrival: currentPO.estimatedArrival == null ? "" : moment.parseZone(currentPO.estimatedArrival).format('MM/DD/YYYY'),
            currency: currentPO.currency,
            approverName: currentPO.approverName,
            approverJobTitle: currentPO.approverJobTitle,
            approverId: Number(currentPO.approverId),
            discount: currentPO.discount,
            remarks: currentPO.remarks,
            pOPendingItemsJsonString: JSON.stringify(currentPO.poPendingItems),
            textLineBreakCount: currentPO.textLineBreakCount,
            approvedOn: currentPO.approvedOn,
            orderNumber: currentPO.orderNumber,

            invoiceDate: currentPO.invoiceDate == null ? "" : moment.parseZone(currentPO.invoiceDate).format('MM/DD/YYYY'),
            termsOfPayment: String(currentPO.termsOfPayment),
            sIOrBI: currentPO.siOrBI

        };

        if (currentPO.cancelledOn != null) {
            data.approvedOn = null;
        }

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

    };

    const onSendEmailUpdatesYesBtnClick = () => {
        
        setSendEmailUpdatesError('');
        setEmailUpdatesSentRequest(true);

        let emailBody = '';
        let subject = `PO No. ${currentPO.orderNumber} ${currentPO.supplierName == null ? '' : currentPO.supplierName}, ${currentPO.customerName == null ? '' : currentPO.customerName} - Updates`;

        emailBody += `
            <p class=MsoNormal>Please see the updates regarding this PO No. ${currentPO.orderNumber}<o:p></o:p></p>
            <p>&nbsp;</p>
        `;

        emailBody += getPOHTMLFormat(currentPO);

        
        emailBody += `
            <p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal><b>Audit trail logs<o:p></o:p></b></p><ul style='margin-top:0cm' type=disc>
        `;


        auditTrails.forEach(l => {
            emailBody += `
            <li class=MsoListParagraph style='margin-left:0cm;mso-list:l0 level1 lfo1'>
                        <span style='color:#7F7F7F;mso-style-textfill-fill-color:#7F7F7F;mso-style-textfill-fill-alpha:100.0%'>${l.userName} &#8211; ${moment.parseZone(l.dateAdded).format('MM/DD/YYYY hh:mm a')}</span>
                        <br>
                        ${l.message}
                        <br>
                        <o:p></o:p>
                    </li>
            
            `;
        });


        emailBody += `
        </ul><p class=MsoNormal><o:p>&nbsp;</o:p></p>
        `;

        emailBody += `
        <p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal><i><span style='font-size:10.0pt;color:#7F7F7F;mso-style-textfill-fill-color:#7F7F7F;mso-style-textfill-fill-alpha:100.0%'>This is system generated message please do not reply.<o:p></o:p></span></i></p></div></body></html>
        `;

        let data = {
            message: {
              subject: subject,
              body: {
                contentType: "HTML",
                content: emailBody
              },
              toRecipients: [],
              ccRecipients: [],
            }
        };

        let tmpTOs = [];
        context.state.sendUpdatesTOs.forEach(v => {
            tmpTOs.push( {
                emailAddress: {
                  address: v
                }
              });
        });

        TOs.split(';').forEach(value => {
            if (value.trim() != "") {
              tmpTOs.push( {
                emailAddress: {
                  address: value
                }
              });
            }
          });

        data.message.toRecipients = tmpTOs;

        let requestObj = {
            scopes: ["Mail.Send"]
          };
        
        myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {

            axios.post('https://graph.microsoft.com/v1.0/me/sendMail', data,  { headers: {
                    'Authorization': 'Bearer ' + tokenResponse.accessToken,
            }})
            .then(response => {
                setShowEmailUpdatesModal(false);

                let r = "";
                data.message.toRecipients.forEach(v => {
                    if (r == "") {
                        r += v.emailAddress.address;
                    } else {
                        r += ";"+v.emailAddress.address;
                    }
                });


                let logData = {
                    POPendingId: currentPO.id,
                    UserName: `${context.state.user.firstName} ${context.state.user.lastName}`,
                    Message: "Sent updates to: " + r
                };
    
                addAuditLog(logData);

            })
            .catch(error => {
                setSendEmailUpdatesError(error.response.data.error.message);
            })
            .finally(() => {
                setEmailUpdatesSentRequest(false);
            });
  
      }).catch(function (error) {
          console.log(error);
      })

        // axios.get(`${SERVER}/po/${currentPO.id}/sendupdates`)
        //     .then(response => {

        //     })
        //     .catch(error => {
        //         console.log(error);
        //     })
        //     .finally(() => {
        //         setEmailUpdatesSentRequest(false);
        //         setShowEmailUpdatesModal(false);
        //     });
    };

    const sendToSupplier = () => {
        setShowSendToSupplierModal(true);
    };

    const ViewMenu = (props) => {

        if (context.state.userAccessRights == ACCESS_RIGHTS.READ) {
            return <div className={styles.row} style={{marginLeft: 'auto', marginBottom: '10px'}}>
                        {
                            previewPDFisLoading ?
                            <span style={{marginLeft: '15px'}}>Processing..</span>
                            :
                            <a className={styles.link} style={{marginLeft: '15px'}} onClick={onPreviewClick}>Preview</a>
                        }
                    </div>
        } else if (context.state.userAccessRights == ACCESS_RIGHTS.MODIFY) {

            return   <div className={styles.row} style={{marginLeft: 'auto', marginBottom: '10px'}}>
                            {
                                currentPO.cancelledOn == null &&
                                <a className={styles.link} style={{marginLeft: '15px'}} onClick={e => context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.EDIT}) }>Edit PO</a>
                            }
                            {
                                previewPDFisLoading ?
                                <span style={{marginLeft: '15px'}}>Processing..</span>
                                :
                                <a className={styles.link} style={{marginLeft: '15px'}} onClick={onPreviewClick}>Preview</a>
                            }
                            {
                                generatePDFOnProgress ?
                                <span style={{marginLeft: '15px'}}>Processing..</span>
                                :
                                <a className={styles.link} style={{marginLeft: '15px'}} onClick={onViewPdfClick}>Generate PDF</a>
                            }
                            {
                                (currentPO.approvedOn != null  && currentPO.cancelledOn == null) &&
                                <a className={styles.link} style={{marginLeft: '15px'}} onClick={sendToSupplier}>Send to Supplier</a>
                            }
                            {
                                (currentPO.status != POStatus.indexOf("Draft") && currentPO.receivedOn != null) &&
                                <a className={styles.link} style={{marginLeft: '15px'}} onClick={e => { setShowSIorBIModal(true); }}>Update S.I.#/B.I.#</a>
                            }
                            {
                                (currentPO.status != POStatus.indexOf("Draft") && currentPO.receivedOn == null) &&
                                <a className={styles.link} style={{marginLeft: '15px'}} onClick={e => { setShowReceivedModal(true); }}>Completed Delivery</a>
                            }
                            {
                                (currentPO.status != POStatus.indexOf("Draft") && currentPO.cancelledOn == null) &&
                                <a className={styles.link} style={{marginLeft: '15px'}} onClick={e => { setReasonError(""); setApproverError(""); setShowCancellationModal(true); }}>Request for Cancellation</a>
                            }
                        </div>

        } else if (context.state.userAccessRights == ACCESS_RIGHTS.RECEIVER) {
            return   <div className={styles.row} style={{marginLeft: 'auto', marginBottom: '10px'}}>
                        {
                            (currentPO.status != POStatus.indexOf("Draft") && currentPO.receivedOn != null) &&
                            <a className={styles.link} style={{marginLeft: '15px'}} onClick={e => { setShowSIorBIModal(true); }}>Update S.I.#/B.I.#</a>
                        }
                        {
                            generatePDFOnProgress ?
                            <span style={{marginLeft: '15px'}}>Processing..</span>
                            :
                            <a className={styles.link} style={{marginLeft: '15px'}} onClick={onViewPdfClick}>Generate PDF</a>
                        }
                        {
                            previewPDFisLoading ?
                            <span style={{marginLeft: '15px'}}>Processing..</span>
                            :
                            <a className={styles.link} style={{marginLeft: '15px'}} onClick={onPreviewClick}>Preview</a>
                        }
                        {
                            (currentPO.status != POStatus.indexOf("Draft") && currentPO.receivedOn == null) &&
                            <a className={styles.link} style={{marginLeft: '15px'}} onClick={e => { setShowReceivedModal(true); }}>Completed Delivery</a>
                        }
                        {
                            (currentPO.status != POStatus.indexOf("Draft") && currentPO.cancelledOn == null) &&
                            <a className={styles.link} style={{marginLeft: '15px'}} onClick={e => { setReasonError(""); setApproverError(""); setShowCancellationModal(true); }}>Request for Cancellation</a>
                        }
                    </div>
        }

    }

    let tmpTotal = currentPO.poPendingItems.reduce((total, item) => { return total + (item.quantity * item.price) }, 0);

    return <div className={styles.viewPO}>
    <div className={styles.row} style={{alignItems: 'center'}}>
        <ViewMenu />
    </div>
    <div className={styles.hr}></div>
    <div className={styles.rowField}>
        <div style={{fontWeight: 'bold'}}>Supplier</div>
        <div>{currentPO.supplierName}</div>
        <div style={{fontWeight: 'bold'}}>PO #</div>
        <div>{currentPO.orderNumber}</div>
    </div>

    <div className={styles.rowField}>
        <div style={{fontWeight: 'bold'}}>Address</div>
        <div>{currentPO.supplierAddress}</div>
        <div style={{fontWeight: 'bold'}}>Reference #</div>
        <div>{currentPO.referenceNumber}</div>
    </div>
    <div className={styles.rowField}>
        <div style={{fontWeight: 'bold'}}></div>
        <div></div>
        <div style={{fontWeight: 'bold'}}>Date</div>
        <div>{currentPO.approvedOn == null ? '' : moment.parseZone(currentPO.approvedOn).format('MM/DD/YYYY')}</div>
    </div>

    <div className={styles.rowField}>
        <div style={{fontWeight: 'bold'}}>Contact Person</div>
        <div>{currentPO.contactPersonName}</div>
        <div style={{fontWeight: 'bold'}}>Expected Delivery</div>
        <div>{currentPO.estimatedArrival == null ? "" : moment.parseZone(currentPO.estimatedArrival).format('MM/DD/YYYY')}</div>
    </div>

    <div className={styles.rowField}>
        <div style={{fontWeight: 'bold'}}>Customer</div>
        <div>{currentPO.customerName}</div>
            
        <div style={{fontWeight: 'bold'}}>Currency</div>
        <div>{currentPO.currency}</div>
    </div>

    <div className={styles.rowField}>
        <div style={{fontWeight: 'bold'}}>S.I# or B.I#</div>
        <div>{currentPO.siOrBI}</div>
        <div style={{fontWeight: 'bold'}}>Terms of Payment</div>
        {
            currentPO.termsOfPayment == "COD" ?
            <div>{currentPO.termsOfPayment}</div>
            :
            <div>{currentPO.termsOfPayment} {(currentPO.termsOfPayment != 0 && currentPO.termsOfPayment != null) && "days"} </div>
        }
    </div>

    <div className={styles.rowField}>
        <div style={{fontWeight: 'bold'}}>Invoice Date</div>
        <div>{currentPO.invoiceDate == null ? "" : moment.parseZone(currentPO.invoiceDate).format('MM/DD/YYYY')}</div>
        <div></div>
        <div></div>
    </div>



            <br/>
            <div className={styles.row}>
                <div style={{width: '60px', fontWeight: 'bold'}} className={`${styles.tableHeaderRowForm}`}>Quantity</div>
                <div style={{flexGrow: 1, fontWeight: 'bold'}} className={`${styles.tableHeaderRowForm}`}>Description</div>
                <div style={{width: '110px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableHeaderRowForm}`}>Price</div>
                <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableHeaderRowForm}`}>Total</div>
            </div>
            {
                currentPO.poPendingItems.map((i,index) =>
                    <div className={`${styles.row} ${styles.withBorderBottom}`} key={index}>
                        <div style={{width: '60px'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                            <div>{ numeral(Number(i.quantity)).format('0,0') }</div>
                        </div>
                        <div style={{flexGrow: 1 }} className={`${styles.tableRowForm}`}>
                            <div style={{width: '615px', marginTop: '8px', marginBottom: '8px', whiteSpace: "pre-wrap" }}>{i.name}</div>
                        </div>
                        <div style={{width: '110px', textAlign: 'right'}} className={`${styles.tableRowForm}`}>
                            <div className={`${styles.numbers}`}>{numeral(Number( i.price )).format('0,0.00')}</div>
                        </div>
                        <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm}`}>
                            <div className={`${styles.numbers}`}>{numeral(Number( i.total )).format('0,0.00')}</div>
                        </div>

                    </div>
                )
            }
            <div className={styles.row}>
                <div style={{width: '60px'}} className={`${styles.tableRowForm}`}></div>
                <div style={{flexGrow: 1}} className={`${styles.tableRowForm}`}></div>
                <div style={{width: '110px'}} className={`${styles.tableRowForm}`}></div>
                <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                    {numeral(Number( tmpTotal )).format('0,0.00')}
                </div>
            </div>
            <div className={styles.row} style={{justifyContent: 'flex-end', alignItems: 'center'}}>
                <div style={{width: '200px',textAlign: 'right'}} className={`${styles.tableRowForm}`}>
                Discount {currentPO.discount}%
                </div>
                <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.numbers}`}>
                    {
                        currentPO.total == 0 ?
                        `0`
                        :
                        `-${numeral((currentPO.discount/100)*tmpTotal).format('0,0.00')}`
                    }
                </div>
            </div>
            <div className={styles.row} style={{justifyContent: 'flex-end', alignItems: 'center'}}>
                <div>
                    <strong>Total Amount</strong>
                </div>
                <div style={{width: '130px', textAlign: 'right', fontWeight: 'bold'}} className={`${styles.tableRowForm} ${styles.withBorderTop} ${styles.numbers}`}>
                    {
                        currentPO.total == 0 ?
                        `0`
                        :
                        `${currentPO.currency}${numeral(currentPO.total).format('0,0.00')}`
                    }
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.field} style={{width: '95%', padding: '0px'}}>
                    <label style={{fontWeight: 'bold'}}>Remarks</label>
                    <div style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{currentPO.remarks}</div>
                </div>
            </div>
            <br/>
            <div className={styles.row}>
                <div className={styles.field} style={{width: '95%', padding: '0px'}}>
                    <label style={{fontWeight: 'bold'}}>Internal Note</label>
                    <div style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{currentPO.internalNote}</div>
                </div>
            </div>
            <br/>
            <div className={styles.rowField}>
                <div style={{fontWeight: 'bold'}}>Approver</div>
                <div>{currentPO.approverName}</div>
                <div></div>
                <div></div>
            </div>
            <div className={styles.rowField}>
                <div style={{fontWeight: 'bold'}}>Status</div>
                <div>{POStatus[currentPO.status]}</div>
                <div></div>
                <div></div>
            </div>

            {/* Internal Attachments */}
            <br/>
            <div className={styles.row} style={{alignItems: 'center'}}>
                <h2>Internal Attachments ({getTotalFilesCountAndSize(pOCurrentAttachments).count} {getTotalFilesCountAndSize(pOCurrentAttachments).count <= 1 ? `File` : `Files`}, {getTotalFilesCountAndSize(pOCurrentAttachments).total}MB)</h2>
            </div>
            {
                isFetchingAttachments ?
                <div>
                    <p>Fetching attachments...</p>
                </div>
                :
                <div>
                    {
                        pOCurrentAttachments.map((a,i) => 
                            <div className={styles.row} style={{alignItems: 'center', marginBottom: '10px'}} key={i}>
                                {a.name}
                            </div>     
                        )
                    }
                </div>
            }

            {/* External Attachments */}
            <br/>
            <div className={styles.row} style={{alignItems: 'center'}}>
                <h2>External Attachments ({getTotalFilesCountAndSize(pOCurrentExternalAttachments).count} {getTotalFilesCountAndSize(pOCurrentExternalAttachments).count <= 1 ? `File` : `Files`}, {getTotalFilesCountAndSize(pOCurrentExternalAttachments).total}MB)</h2>
            </div>
            {
                isFetchingExternalAttachments ?
                <div>
                    <p>Fetching attachments...</p>
                </div>
                :
                <div>
                    {
                        pOCurrentExternalAttachments.map((a,i) => 
                            <div className={styles.row} style={{alignItems: 'center', marginBottom: '10px'}} key={i}>
                                {a.name}
                            </div>     
                        )
                    }
                </div>
            }
     

            <br/>
            <div className={styles.row} style={{alignItems: 'center'}}>
                <h2>Audit Trail</h2>
                <div className={styles.row} style={{marginLeft: 'auto'}}>
                    <a className={styles.link} onClick={e => { setShowEmailUpdatesModal(true); }}>Send Email Updates</a>
                </div>
            </div>
            <div className={styles.hr}></div>
            <div>{fetchingAuditTrailsError}</div>
            {
                !isFetchingAuditTrails ?
                    <div>
                        <textarea disabled={auditTrailIsLoading} onChange={ e => setAuditTrailLogMessage(e.currentTarget.value) } value={auditTrailLogMessage} style={{resize: "none", width: "100%"}} rows={3} ></textarea>
                        {
                            logMessageHasError &&
                            <div className={styles.error}>
                                {logMessageError}
                            </div>
                        }
                        {
                            auditTrailIsLoading &&
                            <div>
                                Sending your message, please wait...
                            </div>   
                        }
                        {
                            !auditTrailIsLoading &&
                            <div className={styles.row} style={{marginTop: '5px'}}>
                                <button className={styles.buttonPrimary} style={{marginLeft: 'auto'}} onClick={onAddAuditTrailClick} >Add</button>
                            </div>
                        }

                        {
                            auditTrails.map(l => 
                                <div key={l.id} className={styles.auditTrailLog}>
                                    <div className={styles.auditTrailLogName}>{l.userName} - { moment.parseZone(l.dateAdded).format('MM/DD/YYYY hh:mm a')}</div>
                                    <div className={styles.auditTrailLogMessage}>{l.message}</div>
                                </div>
                            )
                        }
                
                    </div>
                :
                    <div>Fetching the logs...</div>
            }

            <br/>   

            {/* Received Modal */}
            {
                showReceivedModal &&
                <div className={styles.modal}>
                    <div style={{height: '400px'}}>
                        <div className={styles.header}>
                            <div>Received Delivery Confirmation</div>
                        </div>

                        <div className={styles.body}>
                            {
                                receivedDeliverySentRequest ?
                                <div>Processing your request...</div>
                                :
                                <div>
                                    <p>Are you sure that this order has been arrived?</p>
                                    <p>This will also send an updates about this PO including audit trail logs to:</p>
                                    <ul>
                                        {
                                            context.state.sendUpdatesTOs.map((v,i) => <li key={i}><strong>{v}</strong></li>)
                                        }
                                    </ul>
                                    <br/>
                                    <div className={styles.rowField}>
                                        <div className={styles.label}>TOs</div>
                                        <div>
                                            <input type="text" value={completedDeliveryTOs} onChange={e => setCompletedDeliveryTOs(e.currentTarget.value)} placeholder="enter email addresses delimited with semicolon (;)" />
                                        </div>
                                    </div>
                                    <div className={styles.rowField}>
                                        <div className={styles.label}>S.I# or B.I#</div>
                                        <div>
                                            <input type="text" value={sIOrBI} onChange={e => setSIOrBI(e.currentTarget.value)} />
                                        </div>
                                    </div>
                                    <div className={styles.rowField}>
                                        <div className={styles.label}>Invoice Date</div>
                                        <div>
                                            <div>
                                                <DatePicker
                                                    selected={invoiceDate}
                                                    onChange={value => setInvoiceDate(value)}
                                                    popperPlacement="top-end"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {
                                        sendCompleteDeliveryError != '' &&
                                        <p className={styles.error}>{sendCompleteDeliveryError}</p>
                                    }
                                </div>   
                            }
                        </div>
                        <div className={styles.footer}>
                            {
                                !receivedDeliverySentRequest &&
                                <div>
                                    <button className={styles.buttonSecondary} style={{marginRight: '20px'}} 
                                        onClick={e => { 
                                            setSIOrBI("");
                                            setInvoiceDate(null);
                                            setShowReceivedModal(false);
                                        }}>Cancel</button>
                                    <button className={styles.buttonPrimary} onClick={onYesReceivedDeliveryClick}>Yes</button>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            }

            {/* SIorBI Modal */}
            {
                showSIorBIModal &&
                <div className={styles.modal}>
                    <div style={{height: '400px'}}>
                        <div className={styles.header}>
                            <div>Update S.I.# or B.I.#</div>
                        </div>

                        <div className={styles.body}>
                            {
                                sIorBISentRequest ?
                                <div>Processing your request...</div>
                                :
                                <div>
                                    <div className={styles.rowField}>
                                        <div className={styles.label}>S.I# or B.I#</div>
                                        <div>
                                            <input type="text" value={sIOrBI} onChange={e => setSIOrBI(e.currentTarget.value)} />
                                        </div>
                                    </div>
                                    <div className={styles.rowField}>
                                        <div className={styles.label}>Invoice Date</div>
                                        <div>
                                            <div>
                                                <DatePicker
                                                    selected={invoiceDate}
                                                    onChange={value => setInvoiceDate(value)}
                                                    popperPlacement="top-end"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {
                                        sIorBIDeliveryError != '' &&
                                        <p className={styles.error}>{sIorBIDeliveryError}</p>
                                    }
                                </div>   
                            }
                        </div>
                        <div className={styles.footer}>
                            {
                                !sIorBISentRequest &&
                                <div>
                                    <button className={styles.buttonSecondary} style={{marginRight: '20px'}} 
                                        onClick={e => { 
                                            setSIOrBI("");
                                            setInvoiceDate(null);
                                            setShowSIorBIModal(false);
                                        }}>Cancel</button>
                                    <button className={styles.buttonPrimary} onClick={onYesUpdateSIorBIClick}>Yes</button>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            }


            {/* Cancellation Modal */}
            {
                showCancellationModal &&
                <div className={styles.modal}>
                        <div style={{height: '325px'}}>
                            <div className={styles.header}>
                                <div>PO Cancellation Confirmation</div>
                            </div>

                            <div className={styles.body}>
                                {
                                    cancellationSentRequest ?
                                    <div>Processing your request...</div>
                                    :
                                    <div>
                                        <p>Are you sure you want to cancel this PO?</p>
                                        <div>Please type your reason, this will be send to approver along with the details of this PO.</div>
                                        <textarea style={{resize: 'none', width: '100%', display: 'inline-block'}} value={reason} onChange={e => setReason(e.currentTarget.value)}></textarea>
                                        <span className={styles.error}>{reasonError}</span>
                                        <br/>
                                        <br/>
                                        <label style={{marginRight: '5px'}}>Send this to</label>

                                        <select style={{flexGrow: 1}} value={approver} onChange={e => setApprover(e.currentTarget.value) } >
                                            <option value=""></option>
                                            {
                                                context.state.approvers.map(i => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)
                                            }
                                        </select>
                                        <br/>
                                        <span className={styles.error}>{approverError}</span>
                                    </div>   
                                }
                            </div>

                            <div className={styles.footer}>
                                {
                                    !cancellationSentRequest &&
                                    <div>
                                        <button className={styles.buttonSecondary} style={{marginRight: '20px'}} onClick={e => { setShowCancellationModal(false); }}>Cancel</button>
                                        <button className={styles.buttonPrimary} onClick={onYesCancellationClick}>Yes</button>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
            }

            {/* Email Updates Modal */}
            {
                showEmailUpdatesModal &&
                <div className={styles.modal}>
                    <div>
                        <div className={styles.header}>
                            <div>Send Email Updates Confirmation</div>
                        </div>

                        <div className={styles.body}>
                            {
                                emailUpdatesSentRequest ?
                                <div>Processing your request...</div>
                                :
                                <div>
                                    <p>You are about to send the details of this PO and all audit trail logs to:</p>
                                    <ul>
                                        {
                                            context.state.sendUpdatesTOs.map((v,i) => <li key={i}><strong>{v}</strong></li>)
                                        }
                                    </ul>
                                    <p>If you need to add another email address please type below:</p>
                                    <div className={styles.rowField}>
                                        <div className={styles.label}>TOs</div>
                                        <div>
                                            <input type="text" value={TOs} onChange={e => setTOs(e.currentTarget.value)} placeholder="enter email addresses delimited with semicolon (;)" />
                                        </div>
                                    </div>
                                    {
                                        sendEmailUpdatesError != '' &&
                                        <p className={styles.error}>{sendEmailUpdatesError}</p>
                                    }
                                </div>   
                            }
                        </div>
                        <div className={styles.footer}>
                            {
                                !emailUpdatesSentRequest &&
                                <div>
                                    <button className={styles.buttonSecondary} style={{marginRight: '20px'}} onClick={e => { setShowEmailUpdatesModal(false); }}>Cancel</button>
                                    <button className={styles.buttonPrimary} onClick={onSendEmailUpdatesYesBtnClick}>Yes</button>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            }

            {/* Send to Supplier Modal */}
            {
                showSendToSupplierModal &&
                <EmailModal id={currentPO.id} orderNumber={currentPO.orderNumber} hideModal={() => { setShowSendToSupplierModal(false)}} supplierName={currentPO.supplierName} customerName={currentPO.customerName} contactPersonName={getContactPersonFirstName(currentPO.contactPersonId, currentPO.supplierId, context.state.suppliers)} />
            }

            {/* Preview PDF */}
            {
                showPDFPreview &&
                <PreviewPDF pdf={pdf} pdfPagesNumbering={pdfPagesNumbering} close={() => { setShowPDFPreview(false); }} />
            }

        </div>

}



export default ViewPO;