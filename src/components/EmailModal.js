import * as React from 'react';
import {useContext,useState,useRef,useEffect} from "react";
import styles from './StcPo.module.scss';
import {AppContext} from './StcPo';
import CKEditor from '@ckeditor/ckeditor5-react';
import DecoupledEditor from 'ckeditor5-build-decoupled-document-base64-upload-word-count';
import {SERVER, myMSALObj } from '../utils/constant';
import axios from "axios";
import {readUploadedFileAsBase64} from '../utils/utils';

const VIEWS = {
  FETCHING_PO_PDF: 0,
  EMAIL_MODULE: 1,
  SENDING_EMAIL: 2
};

let tmpAttachments = [];

const EmailModal = (props) => {
  const context = useContext(AppContext);

  const emailEditorContainerRef = useRef(null);
  const emailEditorRef = useRef(null);


  const [emailBody,setEmailBody] = useState('');
  const [TOs,setTOs] = useState('');
  const [CCs,setCCs] = useState('');
  const [subject,setSubject] = useState(`${props.supplierName}: PO No. ${props.orderNumber} - ${props.customerName}`);
  const [view,setView] = useState(VIEWS.FETCHING_PO_PDF);
  const [attachmentName,setAttachmentName] = useState('');
  const [attachment,setAttachment] = useState(null);

  const [TOsError,setTOsError] = useState('');
  const [subjectError,setSubjectError] = useState('');

  const [emailError,setEmailError] = useState('');

  const sendEmail = (e) => {
    setEmailError('');

    let hasError = false;
    setTOsError('');
    if (TOs.trim() == '') {
      setTOsError('This message must have at least one recipient.');
      hasError = true;
    }

    setSubjectError('');
    if (subject.trim() == '') {
      setSubjectError('Subject is empty');
      hasError = true;
    }


    if (hasError) {
      return;
    }

    setView(VIEWS.SENDING_EMAIL);

    let data = {
      message: {
        subject: subject,
        body: {
          contentType: "HTML",
          content: emailBody
        },
        toRecipients: [],
        ccRecipients: [],
        attachments: tmpAttachments
      }
    };

    let tmpTOs = [];
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

    let tmpCCs = [];
    CCs.split(';').forEach(value => {
      if (value.trim() != "") {
        tmpCCs.push( {
          emailAddress: {
            address: value
          }
        });
      }
    });
    data.message.ccRecipients = tmpCCs;

    let requestObj = {
      scopes: ["Mail.Send"]
    };

    myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {

          axios.post('https://graph.microsoft.com/v1.0/me/sendMail', data,  { headers: {
                  'Authorization': 'Bearer ' + tokenResponse.accessToken,
          }})
          .then(response => {
              console.log(response);
              props.hideModal();
          })
          .catch(error => {
              setEmailError(error.response.data.error.message);
              setView(VIEWS.EMAIL_MODULE);
          })

    }).catch(function (error) {
        setEmailError(error.response.data.error.message);
        setView(VIEWS.EMAIL_MODULE);
    });


  }

  useEffect(() => {

    //clear tmpAttachments
    tmpAttachments = [];

    async function fetchData() {
      
      setView(VIEWS.FETCHING_PO_PDF);

      //fetch pdf
      await axios({
        url: `${SERVER}/po/pdf/${props.id}`, //your url
        method: 'GET',
        responseType: 'blob', // important
        })
        .then(response => {
  
            let fileName = `PO-${props.orderNumber}.pdf`;
            let bl = new Blob([response.data]);
        
              let reader = new FileReader();
              reader.onload = function() {
  
                  var dataUrl = reader.result;
                  var base64 = dataUrl.split(',')[1];
  
                  // setAttachmentName(fileName);
                  // setAttachment(base64);
  
                  tmpAttachments.push({
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    name: fileName,
                    contentBytes: base64
                  });
  
              };
        
              reader.readAsDataURL(bl);
  
        })
        .catch(error => {
            console.log(error);
        });

        await axios.get(`${SERVER}/po/externalattachmentsdata/${props.id}`)
          .then(response => {
            response.data.forEach(d => {
              tmpAttachments.push({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: d.name,
                contentBytes: d.file
              });
            });
          })
          .catch(error => {

          });

        setView(VIEWS.EMAIL_MODULE);


    }
    fetchData();


    return () => {
      tmpAttachments = [];
    }

  }, []);



  switch(view) {
    case VIEWS.FETCHING_PO_PDF:
      return <div className={styles.emailModal}>
        <div className={styles.emailModalContainer}>
          <div className={styles.emailTopBar}>
            <div>
              Send PO to Supplier
           </div>
          </div>
          <div className={styles.emailContent}>
            <p>Fetching attachment...</p>
          </div>
        </div>
      </div>;
    case VIEWS.EMAIL_MODULE:
      return <div className={styles.emailModal}>
          <div className={styles.emailModalContainer}>
            <div className={styles.emailTopBar}>
              <div>
                Send PO to Supplier
              </div>
            </div>
            <div className={styles.emailContent}>
              
              <div className={styles.rowField}>
                <div className={styles.label}>TOs</div>
                <div>
                  <input type="text" value={TOs} onChange={e => setTOs(e.currentTarget.value)} placeholder="enter email addresses delimited with semicolon (;)" />
                </div>
              </div>
              {
                TOsError != '' &&
                <div className={styles.rowField}>
                  <div className={styles.label}></div>
                  <div>
                      <div className={styles.error}>{TOsError}</div>
                  </div>
                </div>
              }
              <div className={styles.rowField}>
                <div className={styles.label}>CCs</div>
                <div>
                  <input type="text" value={CCs} onChange={e => setCCs(e.currentTarget.value) } placeholder="enter email addresses delimited with semicolon (;)" />
                </div>
              </div>
              <div className={styles.rowField}>
                <div className={styles.label}>Subject</div>
                <div>
                  <input type="text" value={subject} onChange={e => setSubject(e.currentTarget.value) } />
                </div>
              </div>
              {
                subjectError != '' &&
                <div className={styles.rowField}>
                  <div className={styles.label}></div>
                  <div>
                      <div className={styles.error}>{subjectError}</div>
                  </div>
                </div>
              }
              <div className={styles.rowField}>
                <div className={styles.label}>Attachment</div>
                <div className={styles.row} style={{alignItems: 'center'}}>
                  {
                    tmpAttachments.map((a,i) => <span key={i}>{a.name};&nbsp;</span>)
                  } 
                </div>
              </div>
              <div ref={emailEditorContainerRef} className={styles.emailEditorContainer}>
                  <CKEditor
                      onInit={ editor => {
                          console.log( 'Editor is ready to use!', editor );

                          // Insert the toolbar before the editable area.
                          editor.ui.getEditableElement().parentElement.insertBefore(
                              editor.ui.view.toolbar.element,
                              editor.ui.getEditableElement()
                          );
                      } }
                      onChange={ ( event, editor ) => {
                        setEmailBody(editor.getData());
                      } }
                      editor={ DecoupledEditor }
                      config={{
                        toolbar: ['Heading', '|', 'fontSize', 'fontFamily', '|', 'Bold', 'Italic', 'Underline', 'Strikethrough', '|', 'alignment', '|', 'numberedList', 'bulletedList', '|', 'indent', 'outdent', '|', 'Link', '|', 'Undo', 'Redo'],

                      }}
                      data={`Hi ${props.contactPersonName},<p></p>`}
                  /> 
              </div>
              {
                emailError != '' &&
                <p className={styles.error}>{emailError}</p>
              }
            </div>
            <div className={styles.emailModalFooter}>
              <button className={styles.buttonSecondary} onClick={e => { props.hideModal(); }}  style={{marginRight: '20px'}}>Cancel</button>
              <button className={styles.buttonPrimary} onClick={sendEmail}>Send</button>
            </div>
        </div>
      </div>;
    case VIEWS.SENDING_EMAIL:
      return <div className={styles.emailModal}>
        <div className={styles.emailModalContainer}>
          <div className={styles.emailTopBar}>
            <div>
              Send PO to Supplier
          </div>
          </div>
          <div className={styles.emailContent}>
            <p>Sending email...</p>
          </div>
        </div>
      </div>;
  }

};

export default EmailModal;
