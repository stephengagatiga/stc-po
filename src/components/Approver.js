import * as React from "react";
import {useState,useContext,useRef,useEffect} from "react";
import styles from './StcPo.module.scss';
import {AppContext} from './StcPo';
import {AMOUNT_LOGICAL_OPERATORS, SERVER,ACCESS_RIGHTS} from '../utils/constant';
import axios from "axios";
import Cleave from 'cleave.js/react';
import numeral from 'numeral';

const VIEWS = {
    LOADING: 0,
    LIST: 1,
    NEW: 2,
    EDIT: 3,
    DELETE: 4,
};

const Approver = () => {
    const context = useContext(AppContext);

    const [id,setId] = useState(0);
    const [firstName,setFirstName] = useState("");
    const [firstNameError,setFirstNameError] = useState("");

    const [lastName,setLastName] = useState("");
    const [lastNameError,setLastNameError] = useState("");

    const [email,setEmail] = useState("");
    const [emailError,setEmailError] = useState("");

    const [jobTitle,setJobTitle] = useState("");
    const [jobTitleError,setJobTitleError] = useState("");

    const [amountPHP,setAmountPHP] = useState(0);
    const [amountErrorPHP,setAmountErrorPHP] = useState("");

    const [amountUSD,setAmountUSD] = useState(0);
    const [amountErrorUSD,setAmountErrorUSD] = useState("");

    const [amountEUR,setAmountEUR] = useState(0);
    const [amountErrorEUR,setAmountErrorEUR] = useState(""); 
    const [amountLogicalOperatorPHP,setAmountLogicalOperatorPHP] = useState("Less than");
    const [amountLogicalOperatorUSD,setAmountLogicalOperatorUSD] = useState("Less than");
    const [amountLogicalOperatorEUR,setAmountLogicalOperatorEUR] = useState("Less than");

    const [failedHttpRequest,setFailedHttpRequest] = useState(false);
    const [successToAddApprover,setSuccessToAddApprover] = useState(false);
    const [successToUpdateApprover,setSuccessToUpdateApprover] = useState(false);

    const [view,setView] = useState(VIEWS.LIST);

    const [isAddingApprover,setAddingApprover] = useState(false);
    const [imagePath,setImagePath]  = useState(null);
    const [imageFile,setImageFile] = useState(null);
    const [replaceImg,setReplaceImg] = useState(false);
    const [fileError,setFileError] = useState("");

    const onChangeAmountOperator = (value, currencyCode) => {
        switch(currencyCode) {
            case 'PHP':
                setAmountLogicalOperatorPHP(value);
                break;
            case 'USD':
                setAmountLogicalOperatorUSD(value);
                break;
            case 'EUR':
                setAmountLogicalOperatorEUR(value);
                break;
        }

        if (value.toLowerCase() == "No Limit".toLowerCase()) {
            switch(currencyCode) {
                case 'PHP':
                    setAmountPHP(0);
                    break;
                case 'USD':
                    setAmountUSD(0);
                    break;
                case 'EUR':
                    setAmountEUR(0);
                    break;
            }
        }

    }

    const onNewApproverClick = (e) => {
        setFailedHttpRequest(false);
        setSuccessToAddApprover(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setJobTitle("");
        setAmountPHP(0);
        setAmountLogicalOperatorPHP(AMOUNT_LOGICAL_OPERATORS[0]);
        setAmountUSD(0);
        setAmountLogicalOperatorUSD(AMOUNT_LOGICAL_OPERATORS[0]);
        setAmountEUR(0);
        setAmountLogicalOperatorEUR(AMOUNT_LOGICAL_OPERATORS[0]);
        setImagePath(null);

        setFileError("");
        setFirstNameError("");
        setLastNameError("");
        setEmailError("");
        setJobTitleError("");
        setAmountErrorPHP("");
        setAmountErrorUSD("");
        setAmountErrorEUR("");

        setView(VIEWS.NEW);
    }

    const onSaveApproverClick = (e) => {
        let hasError = validateForm();
        setFailedHttpRequest(false);
        setSuccessToAddApprover(false);


        if (!hasError) {
            setAddingApprover(true);

            let formData = new FormData();
            formData.append('firstName',firstName);
            formData.append('lastName',lastName);
            formData.append('email',email);
            formData.append('jobTitle',jobTitle);
            formData.append('amountPHP',amountPHP);
            formData.append('amountUSD',amountUSD);
            formData.append('amountEUR',amountEUR);
            formData.append('amountLogicalOperatorPHP',amountLogicalOperatorPHP);
            formData.append('amountLogicalOperatorUSD',amountLogicalOperatorUSD);
            formData.append('amountLogicalOperatorEUR',amountLogicalOperatorEUR);

            console.log(imageFile);
            formData.append('imageFile',imageFile);


            axios.post(`${SERVER}/po/approver`, formData, {headers: {
                'Content-Type': 'multipart/form-data',
                "Access-Control-Allow-Origin": "*"
              }})
                .then(response => {
                    setFirstName("");
                    setLastName("");
                    setEmail("");
                    setAmountLogicalOperatorPHP(AMOUNT_LOGICAL_OPERATORS[0]);
                    setAmountPHP(0);

                    let tmp = JSON.parse(JSON.stringify(context.state.approvers));
                    tmp.unshift(response.data);

                    context.dispatch.setApproversDispatch({type: 'CHANGE', value: tmp});
                    setView(VIEWS.LIST);
                })
                .catch(error => {
                    setFailedHttpRequest(true);
                })
                .finally(() => {
                    setAddingApprover(false);
                });

        }

    }

    const onEditApprover = (e) => {
        if (context.state.userAccessRights != ACCESS_RIGHTS.MODIFY) {
            return;
        }

        let id = e.currentTarget.getAttribute('data-id');
        let approver = context.state.approvers.filter(a => a.id == id)[0];
        setFailedHttpRequest(false);
        setSuccessToUpdateApprover(false);
        setId(id);
        setFirstName(approver.firstName);
        setLastName(approver.lastName);
        setEmail(approver.email);
        setJobTitle(approver.jobTitle);

        setAmountLogicalOperatorPHP(approver.amountLogicalOperatorPHP);
        setAmountPHP(approver.amountPHP);
        setAmountLogicalOperatorUSD(approver.amountLogicalOperatorUSD);
        setAmountUSD(approver.amountUSD);
        setAmountLogicalOperatorEUR(approver.amountLogicalOperatorEUR);
        setAmountEUR(approver.amountEUR);
        setImagePath(`${SERVER}/po/approver/${id}/signature/?t=${new Date()}`)


        setFileError("");
        setFirstNameError("");
        setLastNameError("");
        setEmailError("");
        setAmountErrorPHP("");
        setAmountErrorEUR("");
        setAmountErrorUSD("");

        setView(VIEWS.EDIT);
    }

    const onUpdateApproverClick = (e) => {
        let hasError = validateForm();
        setSuccessToUpdateApprover(false);
        setFailedHttpRequest(false);


        if (!hasError) {
            setAddingApprover(true);
            let data = {
                id,
                firstName,
                lastName,
                email,
                jobTitle,
                amountPHP,
                amountUSD,
                amountEUR,
                amountLogicalOperatorPHP,
                amountLogicalOperatorUSD,
                amountLogicalOperatorEUR
            };

            let formData = new FormData();
            formData.append('id',id);
            formData.append('firstName',firstName);
            formData.append('lastName',lastName);
            formData.append('email',email);
            formData.append('jobTitle',jobTitle);
            formData.append('amountPHP',amountPHP);
            formData.append('amountUSD',amountUSD);
            formData.append('amountEUR',amountEUR);
            formData.append('amountLogicalOperatorPHP',amountLogicalOperatorPHP);
            formData.append('amountLogicalOperatorEUR',amountLogicalOperatorEUR);
            formData.append('amountLogicalOperatorUSD',amountLogicalOperatorUSD);
            formData.append('imageFile',imageFile);
            formData.append('replaceImg',replaceImg);


            axios.put(`${SERVER}/po/approver/${id}`, formData, { headers: {
                'Content-Type': 'multipart/form-data',
                "Access-Control-Allow-Origin": "*"
              } })
                .then(response => {
                    let tmp = JSON.parse(JSON.stringify(context.state.approvers));
                    tmp = tmp.filter(i => i.id != id);
                    tmp.unshift(data);
                    context.dispatch.setApproversDispatch({ type: 'CHANGE', value: tmp});
                    setView(VIEWS.LIST);
                })
                .catch(error => {
                    setFailedHttpRequest(true);
                })
                .finally(() => {
                    setAddingApprover(false);
                });

        }
    }

    const onDeleteClick = () => {
        setView(VIEWS.LOADING);
        axios.delete(`${SERVER}/po/approver/${id}`, { headers: {"Access-Control-Allow-Origin": "*"} })
            .then(response => {
                let tmp = JSON.parse(JSON.stringify(context.state.approvers));
                tmp = tmp.filter(i => i.id != id);
                context.dispatch.setApproversDispatch({ type: 'CHANGE', value: tmp});
            })
            .catch(error => {
                
            })
            .finally(() => {
                setView(VIEWS.LIST);
            });
    }

    const validateForm = () => {
        let hasError = false;

        setFirstNameError("");
        if (firstName.trim() == "") {
            setFirstNameError("Please enter the first name");
            hasError = true;
        }

        setLastNameError("");
        if (lastName.trim() == "") {
            setLastNameError("Please enter the last name");
            hasError = true;
        }

        setEmailError("");
        if (email.trim() == "") {
            setEmailError("Please enter the email");
            hasError = true;
        }

        setJobTitleError("");
        if (jobTitle.trim() == "") {
            setJobTitleError("Please enter the job title");
            hasError = true;
        }

        setFileError("");
        if (imagePath == null) {
            setFileError("Please upload your signature");
            hasError = true;   
        }

        return hasError;
    }


    if (context.state.isApproverLoading) {
        return <div className={styles.approverContent}>Please wait, while processing your request.</div>
    } else {
        switch(view) {
            case VIEWS.LIST:
                return <div className={styles.approverContent}>
                        <div className={styles.row} style={{alignItems: 'center'}}>
                            <h2>Approver</h2>
                            {
                                context.state.userAccessRights == ACCESS_RIGHTS.MODIFY &&
                                <button style={{marginLeft: 'auto'}} className={styles.buttonPrimary} onClick={onNewApproverClick} >New</button>
                            }
                        </div>
                        <div className={styles.hr}></div>
                        <table className={ context.state.userAccessRights == ACCESS_RIGHTS.MODIFY ? `${styles.tableListView} ${styles.tableRowClickable}` : `${styles.tableListView}` }>
                            <thead>
                                <tr>
                                    <td>Name</td>
                                    <td>Email</td>
                                    <td>Job Title</td>
                                    <td>Amount can approve</td>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    context.state.approvers.map(a => <tr key={a.id} onClick={onEditApprover} data-id={a.id}>
                                        <td>{a.firstName} {a.lastName}</td>
                                        <td>{a.email}</td>
                                        <td>{a.jobTitle}</td>
                                        <td>
                                            PHP: {a.amountLogicalOperatorPHP == 'No Limit' ? `${a.amountLogicalOperatorPHP}` : `${a.amountLogicalOperatorPHP} ₱${numeral(a.amountPHP).format('0,0')}`}
                                            <br/>
                                            USD: {a.amountLogicalOperatorUSD == 'No Limit' ? `${a.amountLogicalOperatorUSD}` : `${a.amountLogicalOperatorUSD} $${numeral(a.amountUSD).format('0,0')}`}
                                            <br/>
                                            EUR: {a.amountLogicalOperatorEUR == 'No Limit' ? `${a.amountLogicalOperatorEUR}` : `${a.amountLogicalOperatorEUR} €${numeral(a.amountEUR).format('0,0')}`}
                                        </td>
                                    </tr>)
                                }
                            </tbody>
                        </table>
                </div>
            case VIEWS.NEW:
                return <div className={styles.approverContent}>
                        <div className={styles.row} style={{alignItems: 'center'}}>
                            <h2>New Approver</h2>
                        </div>
                        <div className={styles.hr}></div>
                        {
                            failedHttpRequest &&
                            <div className={`${styles.error} ${styles.errorBorder}`}>
                                We're having trouble processing your request
                            </div>
                        }
                        {
                            successToAddApprover &&
                            <div className={`${styles.success} ${styles.successBorder}`}>
                                New approver has been added
                            </div>
                        }
                        <table style={{maxWidth: '800px'}}>
                            <tbody>
                                <tr>
                                    <td>First name</td>
                                    <td>
                                        <input readOnly={isAddingApprover} type="text" value={firstName} style={{width: '400px'}} onChange={e => setFirstName(e.currentTarget.value)} />
                                        <br/>
                                        <span className={styles.error}>{firstNameError}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Last name</td>
                                    <td>
                                        <input readOnly={isAddingApprover} type="text" value={lastName} style={{width: '400px'}} onChange={e => setLastName(e.currentTarget.value)} />
                                        <br/>
                                        <span className={styles.error}>{lastNameError}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Email</td>
                                    <td>
                                        <input readOnly={isAddingApprover} type="text" value={email} style={{width: '400px'}} onChange={e => setEmail(e.currentTarget.value)} />
                                        <br/>
                                        <span className={styles.error}>{emailError}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Job Title</td>
                                    <td>
                                        <input readOnly={isAddingApprover} type="text" value={jobTitle} style={{width: '400px'}} onChange={e => setJobTitle(e.currentTarget.value)} />
                                        <br/>
                                        <span className={styles.error}>{jobTitleError}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Limit the PO that can approve by amount (PHP)</td>
                                    <td>
                                        <select readOnly={isAddingApprover} style={{width: '250px'}} value={amountLogicalOperatorPHP} onChange={e => { onChangeAmountOperator(e.currentTarget.value, 'PHP') }}>
                                            {
                                                AMOUNT_LOGICAL_OPERATORS.map((v,i) => <option key={i}>{v}</option>)
                                            }
                                        </select>
                                        <Cleave placeholder="" options={{
                                            numeral: true,
                                            numeralThousandsGroupStyle: 'thousand',
                                            prefix: "₱"
                                        }}
                                        value={amountPHP}
                                        onChange={e => 
                                            {
                                                //remove the prefix
                                                setAmountPHP(Number(e.target.rawValue.substring(1,e.target.rawValue.length)))
                                            }
                                        }
                                        style={{width: '150px', textAlign: 'right'}}
                                        readOnly={isAddingApprover}
                                        disabled={amountLogicalOperatorPHP == 'No Limit' ? true : false}
                                        />
                                        <br/>
                                        <span className={styles.error}>{amountErrorPHP}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Limit the PO that can approve by amount (USD)</td>
                                    <td>
                                        <select readOnly={isAddingApprover} style={{width: '250px'}} value={amountLogicalOperatorUSD} onChange={e => { onChangeAmountOperator(e.currentTarget.value, 'USD') }}>
                                            {
                                                AMOUNT_LOGICAL_OPERATORS.map((v,i) => <option key={i}>{v}</option>)
                                            }
                                        </select>
                                        <Cleave placeholder="" options={{
                                            numeral: true,
                                            numeralThousandsGroupStyle: 'thousand',
                                            prefix: "$"
                                        }}
                                        value={amountUSD}
                                        onChange={e => 
                                            {
                                                //remove the prefix
                                                setAmountUSD(Number(e.target.rawValue.substring(1,e.target.rawValue.length)))
                                            }
                                        }
                                        style={{width: '150px', textAlign: 'right'}}
                                        readOnly={isAddingApprover}
                                        disabled={amountLogicalOperatorUSD == 'No Limit' ? true : false}
                                        />
                                        <br/>
                                        <span className={styles.error}>{amountErrorUSD}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Limit the PO that can approve by amount (EUR)</td>
                                    <td>
                                        <select readOnly={isAddingApprover} style={{width: '250px'}} value={amountLogicalOperatorEUR} onChange={e => { onChangeAmountOperator(e.currentTarget.value, 'EUR') }}>
                                            {
                                                AMOUNT_LOGICAL_OPERATORS.map((v,i) => <option key={i}>{v}</option>)
                                            }
                                        </select>
                                        <Cleave placeholder="" options={{
                                            numeral: true,
                                            numeralThousandsGroupStyle: 'thousand',
                                            prefix: "€"
                                        }}
                                        value={amountEUR}
                                        onChange={e => 
                                            {
                                                //remove the prefix
                                                setAmountEUR(Number(e.target.rawValue.substring(1,e.target.rawValue.length)))
                                            }
                                        }
                                        style={{width: '150px', textAlign: 'right'}}
                                        readOnly={isAddingApprover}
                                        disabled={amountLogicalOperatorEUR == 'No Limit' ? true : false}
                                        />
                                        <br/>
                                        <span className={styles.error}>{amountErrorEUR}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{verticalAlign: 'top'}}>Upload Signature Image</td>
                                    <td>
                                        {
                                            imagePath == null ?
                                            <div>
                                                <input type="file" accept="image/*" onChange={e => { 
                                                    let fileSize = Math.round((e.currentTarget.files[0].size / 1024)/1024);
                                                    if (fileSize <= 10) {
                                                        setFileError("")
                                                        let reader = new FileReader();
        
                                                        setImageFile(e.currentTarget.files[0]);
                                                        reader.onload = (e) => {
                                                            setImagePath(e.target.result)
                                                        } 
                                                        reader.readAsDataURL(e.currentTarget.files[0]); 
                                                    } else {
                                                        e.currentTarget.value = null;
                                                        setFileError("File is more than 10MB")
                                                    }
                                                }}  />
                                                <br/>
                                                <span style={{fontStyle: 'italic'}}>File size must not be greater than 10MB</span>
                                                <br/>
                                                <span className={styles.error}>{fileError}</span>
                                            </div>
                                            :
                                            <div>
                                                <img src={imagePath} width="400px" />
                                                <br/>
                                                <button className={styles.buttonSecondary} onClick={e => setImagePath(null) }>Clear Image</button>
                                            </div>
                                        }
                                        <br/>
                                        <span className={styles.error}></span>
                                    </td>
                                </tr>
                                {
                                    isAddingApprover &&
                                    <tr>
                                        <td colSpan={2}>Please wait while we're adding the approver...</td>
                                    </tr>
                                }
                                {
                                    !isAddingApprover &&
                                    <tr>
                                        <td>
                                            <button className={styles.buttonSecondary} onClick={e => setView(VIEWS.LIST) }>Cancel</button>
                                        </td>
                                        <td style={{width: '300px', textAlign: 'right'}}>
                                            <button className={styles.buttonPrimary} onClick={onSaveApproverClick}>Save</button>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
            case VIEWS.LOADING:
                return <div className={styles.approverContent}>Please wait, while processing your request.</div>
            case VIEWS.EDIT:
                    return <div className={styles.approverContent}>
                    <div className={styles.row} style={{alignItems: 'center'}}>
                        <h2>Update Approver</h2>
                    </div>
                    <div className={styles.hr}></div>
                    {
                        failedHttpRequest &&
                        <div className={`${styles.error} ${styles.errorBorder}`}>
                            We're having trouble processing your request
                        </div>
                    }
                    {
                        successToUpdateApprover &&
                        <div className={`${styles.success} ${styles.successBorder}`}>
                            Approver has been updated
                        </div>
                    }
                    <table style={{maxWidth: '800px'}}>
                        <tbody>
                            <tr>
                                <td>First name</td>
                                <td>
                                    <input readOnly={isAddingApprover} type="text" value={firstName} style={{width: '400px'}} onChange={e => setFirstName(e.currentTarget.value)} />
                                    <br/>
                                    <span className={styles.error}>{firstNameError}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Last name</td>
                                <td>
                                    <input readOnly={isAddingApprover} type="text" value={lastName} style={{width: '400px'}} onChange={e => setLastName(e.currentTarget.value)} />
                                    <br/>
                                    <span className={styles.error}>{lastNameError}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Email</td>
                                <td>
                                    <input readOnly={isAddingApprover} type="text" value={email} style={{width: '400px'}} onChange={e => setEmail(e.currentTarget.value)} />
                                    <br/>
                                    <span className={styles.error}>{emailError}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Job Title</td>
                                <td>
                                    <input readOnly={isAddingApprover} type="text" value={jobTitle} style={{width: '400px'}} onChange={e => setJobTitle(e.currentTarget.value)} />
                                    <br/>
                                    <span className={styles.error}>{jobTitleError}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Limit the PO that can approve by amount (PHP)</td>
                                <td>
                                    <select readOnly={isAddingApprover} style={{width: '250px'}} value={amountLogicalOperatorPHP} onChange={e => { onChangeAmountOperator(e.currentTarget.value, 'PHP') }}>
                                        {
                                            AMOUNT_LOGICAL_OPERATORS.map((v,i) => <option key={i}>{v}</option>)
                                        }
                                    </select>
                                    <Cleave placeholder="" options={{
                                        numeral: true,
                                        numeralThousandsGroupStyle: 'thousand',
                                        prefix: "₱"
                                    }}
                                    value={amountPHP}
                                    onChange={e => 
                                        {
                                            //remove the prefix
                                            setAmountPHP(Number(e.target.rawValue.substring(1,e.target.rawValue.length)))
                                        }
                                    }
                                    style={{width: '150px', textAlign: 'right'}}
                                    readOnly={isAddingApprover}
                                    disabled={amountLogicalOperatorPHP == 'No Limit' ? true : false}
                                    />
                                    <br/>
                                    <span className={styles.error}>{amountErrorPHP}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Limit the PO that can approve by amount (USD)</td>
                                <td>
                                    <select readOnly={isAddingApprover} style={{width: '250px'}} value={amountLogicalOperatorUSD} onChange={e => { onChangeAmountOperator(e.currentTarget.value, 'USD') }}>
                                        {
                                            AMOUNT_LOGICAL_OPERATORS.map((v,i) => <option key={i}>{v}</option>)
                                        }
                                    </select>
                                    <Cleave placeholder="" options={{
                                        numeral: true,
                                        numeralThousandsGroupStyle: 'thousand',
                                        prefix: "$"
                                    }}
                                    value={amountUSD}
                                    onChange={e => 
                                        {
                                            //remove the prefix
                                            setAmountUSD(Number(e.target.rawValue.substring(1,e.target.rawValue.length)))
                                        }
                                    }
                                    style={{width: '150px', textAlign: 'right'}}
                                    readOnly={isAddingApprover}
                                    disabled={amountLogicalOperatorUSD == 'No Limit' ? true : false}
                                    />
                                    <br/>
                                    <span className={styles.error}>{amountErrorUSD}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>Limit the PO that can approve by amount (EUR)</td>
                                <td>
                                    <select readOnly={isAddingApprover} style={{width: '250px'}} value={amountLogicalOperatorEUR} onChange={e => { onChangeAmountOperator(e.currentTarget.value, 'EUR') }}>
                                        {
                                            AMOUNT_LOGICAL_OPERATORS.map((v,i) => <option key={i}>{v}</option>)
                                        }
                                    </select>
                                    <Cleave placeholder="" options={{
                                        numeral: true,
                                        numeralThousandsGroupStyle: 'thousand',
                                        prefix: "€"
                                    }}
                                    value={amountEUR}
                                    onChange={e => 
                                        {
                                            //remove the prefix
                                            setAmountEUR(Number(e.target.rawValue.substring(1,e.target.rawValue.length)))
                                        }
                                    }
                                    style={{width: '150px', textAlign: 'right'}}
                                    readOnly={isAddingApprover}
                                    disabled={amountLogicalOperatorEUR == 'No Limit' ? true : false}
                                    />
                                    <br/>
                                    <span className={styles.error}>{amountErrorEUR}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style={{verticalAlign: 'top'}}>Upload Signature Image</td>
                                <td>
                                    {
                                        imagePath == null ?
                                        <div>
                                            <input type="file" accept="image/*" onChange={e => { 
                                                let fileSize = Math.round((e.currentTarget.files[0].size / 1024)/1024);
                                                if (fileSize <= 10) {
                                                    setFileError("");
                                                    setReplaceImg(true);
                                                    let reader = new FileReader();
    
                                                    setImageFile(e.currentTarget.files[0]);
                                                    reader.onload = (e) => {
                                                        setImagePath(e.target.result)
                                                    } 
                                                    reader.readAsDataURL(e.currentTarget.files[0]); 
                                                } else {
                                                    e.currentTarget.value = null;
                                                    setFileError("File is more than 10MB")
                                                } 
                                            }}  />
                                            <br/>
                                            <span style={{fontStyle: 'italic'}}>File size must not be greater than 10MB</span>
                                            <br/>
                                            <span className={styles.error}>{fileError}</span>
                                        </div>
                                        :
                                        <div>
                                            <img src={`${imagePath}`} width="400px" />
                                            <br/>
                                            <button className={styles.buttonSecondary} onClick={e => setImagePath(null) }>Clear Image</button>
                                        </div>
                                    }
                                    <br/>
                                    <span className={styles.error}></span>
                                </td>
                            </tr>
                            <tr>
                                <td></td>
                                <td style={{width: '300px', fontStyle: 'italic'}}></td>
                            </tr>
                            {
                                isAddingApprover &&
                                <tr>
                                    <td colSpan={2}>Please wait while we're adding the approver...</td>
                                </tr>
                            }
                            {
                                !isAddingApprover &&
                                <tr>
                                    <td>
                                        <button className={styles.buttonSecondary} onClick={e => setView(VIEWS.LIST) } style={{marginRight: '20px'}}>Cancel</button>
                                        <button className={styles.buttonSecondary} onClick={e => setView(VIEWS.DELETE) }>Delete</button>
                                    </td>
                                    <td style={{width: '300px', textAlign: 'right'}}>
                                        <button className={styles.buttonPrimary} onClick={onUpdateApproverClick}>Update</button>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            case VIEWS.DELETE:
                    return <div className={styles.approverContent}>
                        <div className={styles.row} style={{alignItems: 'center'}}>
                            <h2>Delete Approver</h2>
                        </div>
                        <div className={styles.hr}></div>
                        <p>Are you sure you want to delete <strong>{`${firstName} ${lastName}`}?</strong></p>
                        <button className={styles.buttonSecondary} onClick={e => setView(VIEWS.EDIT) } style={{marginRight: '20px'}}>Cancel</button>
                        <button className={styles.buttonPrimary} style={{marginLeft: '100px'}} onClick={onDeleteClick}>Yes</button>
                    </div>
        }
    }



}
export default Approver;