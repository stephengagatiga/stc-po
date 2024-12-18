import * as React from "react";
import {useState,useContext,useRef,useEffect} from "react";
import styles from './StcPo.module.scss';
import {AppContext} from './StcPo';
import { SERVER,ACCESS_RIGHTS} from '../utils/constant';
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

    const [view,setView] = useState(VIEWS.LIST);
    const [supplierId,setSupplierId] = useState(null);
    const [supplierName,setSupplierName] = useState("");
    const [supplierNameError,setSupplierNameError] = useState("");

    const [address,setAddress] = useState("");
    const [addressError,setAddressError] = useState("");

    const [requestHasError,setRequestHasError] = useState(false);

    const [contactPersons,setContactPersons] = useState([{
        id: 0,
        firstName: "",
        firstNameError: "",
        lastName: "",
        lastNameError: ""
    }]);

    //this will hold all items that will be remove in database
    const [contactPersonsTmp,setContactPersonsTmp] = useState([]);

    const [isAddingSupplier,setIsAddingSupplier] = useState(false);
    const [isUpdatingSupplier,setIsUpdatingSupplier] = useState(false);

    const changeContactPersonItem = (e) => {
        let value = e.currentTarget.value;
        let id = e.currentTarget.getAttribute('data-id');
        let name = e.currentTarget.getAttribute('name');

        let tmpContactPersons = JSON.parse(JSON.stringify(contactPersons));
        tmpContactPersons.forEach(p => {
            if (p.id == id) {
                p[name] = value;
            }
        });
        setContactPersons(tmpContactPersons);
    }

    const addContactPersonClick = (e) => {
        let tmpContactPersons = JSON.parse(JSON.stringify(contactPersons));
        tmpContactPersons.push(
            {
                id: tmpContactPersons[tmpContactPersons.length-1].id+1,
                firstName: "",
                firstNameError: "",
                lastName: "",
                lastNameError: "",
                type: "ADD"
            }
        );

        setContactPersons(tmpContactPersons);
    }

    //This will call when user click remove contact person
    const removeContactPersonClick = (e) => {
        let id = e.currentTarget.getAttribute('data-id');
        let itemToRemove = contactPersons.filter(p => p.id == id)[0]; 
        let tmpContactPersons = contactPersons.filter(p => p.id != id);

        //You need to add type = DELETE so when you sent this to server
        //the server will know that this item is need to delete not add or update 
        if (itemToRemove.type == "EDIT") {
            //Add only the item that are existing in the database
            let t = JSON.parse(JSON.stringify(contactPersonsTmp));
            //Change the item type to DELETE
            itemToRemove.type = "DELETE";

            //Add some temp data
            //it will cause an error if user remove the first/last name then remove the item
            //the server will check this and will cause an error if any of the following is empty
            itemToRemove.firstName = "TEMP";
            itemToRemove.lastName = "TEMP";

            t.push(itemToRemove);
            //save the delete item to temporary list
            setContactPersonsTmp(t);
        }

        setContactPersons(tmpContactPersons);
    }

    const onNewClick = (e) => {
        setRequestHasError(false);

        setSupplierName("");
        setAddress("");
        setSupplierNameError("");
        setAddressError("");

        setContactPersons([{
            id: 0,
            firstName: "",
            firstNameError: "",
            lastName: "",
            lastNameError: ""
        }]);

        setView(VIEWS.NEW);
    }

    const validateForm = () => {
        let hasError = false;
        setAddressError("");
        setSupplierNameError("");


        if (supplierName.trim() == "") {
            hasError = true;
            setSupplierNameError("Please input supplier name");
        }

        if (address.trim() == "") {
            hasError = true;
            setAddressError("Please input supplier address");
        }

        let tmpContactPersons = JSON.parse(JSON.stringify(contactPersons));
        tmpContactPersons.forEach(p => {
            p.firstNameError = "";
            p.lastNameError = "";

            if (p.firstName.trim() == "") {
                p.firstNameError = "Please input first name";
                hasError = true;
            } 
            if (p.lastName.trim() == "") {
                p.lastNameError = "Please input last name";
                hasError = true;
            }
        });
        
        setContactPersons(tmpContactPersons);
        return hasError;
    }

    const saveClick = (e) => {
        let hasError = validateForm();

        if (!hasError) {
            setIsAddingSupplier(true);
            setRequestHasError(false);
            let cp = [];

            contactPersons.forEach(p => {
                cp.push({
                    firstName: p.firstName.trim(),
                    lastName: p.lastName.trim()
                });
            });

            let data = {
                name: supplierName.trim(),
                address: address.trim(),
                contactPersons: cp
            };

            axios.post(`${SERVER}/po/supplier`, data, { headers: {"Access-Control-Allow-Origin": "*"}  })
                .then(response => {
                    console.log(response.data);
                    let tmp = JSON.parse(JSON.stringify(context.state.suppliers));
                    tmp.unshift(response.data);
                    console.log(tmp);
                    context.dispatch.setSuppliersDispatch({ type: 'CHANGE', value: tmp});
                    setView(VIEWS.LIST);
                })
                .catch(error => {
                    setRequestHasError(true);
                })
                .finally(() => {
                    setIsAddingSupplier(false);
                });
        }
    }

    //this will call when user click in any supplier in the list 
    const editClick = (e) => {
        setSupplierNameError("");
        setAddressError("");

        let supplier = context.state.suppliers.filter(s => s.id == e.currentTarget.getAttribute('data-id'))[0];
        setSupplierName(supplier.name);
        setAddress(supplier.address);
        let cp = [];
        setSupplierId(supplier.id);

        //You need to add type = Edit so when you sent this to server
        //the server will know that this item is need to update not add or remove
        supplier.contactPersons.forEach(c => {
            c.type = "EDIT";
            cp.push(c);
        })
        setContactPersons(cp);
        setView(VIEWS.EDIT);
    }

    //this will call when user click the update button in supplier edit view
    const updateClick = (e) => {
        let hasError = validateForm();

        if (!hasError) {
            setIsUpdatingSupplier(true);
            setRequestHasError(false);
            let cp = [];

            contactPersons.forEach(p => {
                cp.push({
                    id: p.id,
                    firstName: p.firstName.trim(),
                    lastName: p.lastName.trim(),
                    type: p.type
                });
            });

            //Append the items that will be remove in the database
            contactPersonsTmp.forEach(p => {
                cp.push({
                    id: p.id,
                    firstName: p.firstName.trim(),
                    lastName: p.lastName.trim(),
                    type: p.type
                });
            });

            let data = {
                name: supplierName.trim(),
                address: address.trim(),
                contactPersons: cp
            };

            console.log(data);

            axios.put(`${SERVER}/po/supplier/${supplierId}`, data, { headers: {"Access-Control-Allow-Origin": "*"} })
                .then(response => {
                    let tmp = JSON.parse(JSON.stringify(context.state.suppliers));
                    tmp = tmp.filter(s => s.id != supplierId);
                    tmp.unshift(response.data);
                    context.dispatch.setSuppliersDispatch({ type: 'CHANGE', value: tmp});
                    setView(VIEWS.LIST);
                })
                .catch(error => {
                    setRequestHasError(true);
                })
                .finally(() => {
                    setIsUpdatingSupplier(false);
                });
        }
    }

    if (context.state.isSuppliersLoading) {
         return <div className={styles.supplierContent}>
             <p>Fetching suppliers...</p>
         </div>
    } else {
        switch(view) {
            case VIEWS.LIST:
                return  <div className={styles.supplierContent}>
                            <div className={styles.row} style={{alignItems: 'center'}}>
                                <h2>Supplier</h2>
                                {
                                    context.state.userAccessRights == ACCESS_RIGHTS.MODIFY &&
                                    <button style={{marginLeft: 'auto'}} className={styles.buttonPrimary} onClick={onNewClick}>New</button>
                                }
                            </div>
                            <div className={styles.hr}></div>
                            <table className={ context.state.userAccessRights == ACCESS_RIGHTS.MODIFY ? `${styles.tableListView} ${styles.tableRowClickable}` : `${styles.tableListView}`}>
                            <thead>
                                <tr>
                                    <td>Supplier</td>
                                    <td>Address</td>
                                </tr>
                            </thead>
                            {
                                 context.state.userAccessRights == ACCESS_RIGHTS.MODIFY ?
                                <tbody>
                                    {
                                        context.state.suppliers.map(s =>
                                            <tr key={s.id} data-id={s.id} onClick={editClick}>
                                                <td>{s.name}</td>
                                                <td>{s.address}</td>
                                            </tr>)
                                    }
                                </tbody>
                                :
                                <tbody>
                                    {
                                        context.state.suppliers.map(s =>
                                            <tr key={s.id} data-id={s.id}>
                                                <td>{s.name}</td>
                                                <td>{s.address}</td>
                                            </tr>)
                                    }
                                </tbody>
                            }
                            </table>
                        </div>
            case VIEWS.NEW:
                return  <div className={styles.supplierContent}>
                            <div className={styles.row} style={{alignItems: 'center'}}>
                                <h2>New Supplier</h2>
                            </div>
                            <div className={styles.hr}></div>
                            <table style={{maxWidth: '800px'}}>
                                <tbody>
                                    <tr>
                                        <td style={{width: '180px'}}>Supplier Name</td>
                                        <td colSpan={2}>
                                            <input readOnly={isAddingSupplier} type="text" value={supplierName} style={{width: '400px'}} onChange={e => setSupplierName(e.currentTarget.value)} />
                                            <br/>
                                            <span className={styles.error}>{supplierNameError}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{width: '180px'}}>Address</td>
                                        <td colSpan={2}>
                                            <textarea readOnly={isAddingSupplier} style={{width: '400px', resize: 'none'}}  value={address} onChange={e => setAddress(e.currentTarget.value)}></textarea>
                                            <br/>
                                            <span className={styles.error}>{addressError}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3}>
                                            <strong>Contact Persons</strong>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            {
                                contactPersons.map((p,index) =>
                                    <table style={{maxWidth: '580px'}} key={p.id}>
                                        <tbody>
                                            <tr>
                                                <td style={{minWidth: '180px'}}>
                                                    Name
                                                </td>
                                                <td>
                                                    <input readOnly={isAddingSupplier} data-id={p.id} placeholder="First name" name="firstName" type="text" value={p.firstName} style={{width: '200px'}} onChange={changeContactPersonItem} />
                                                    <br/>
                                                    <span className={styles.error}>{p.firstNameError}</span>
                                                </td>
                                                <td>
                                                    <input readOnly={isAddingSupplier} data-id={p.id} placeholder="Last name" name="lastName" type="text" value={p.lastName} style={{width: '200px'}} onChange={changeContactPersonItem} />
                                                    <br/>
                                                    <span className={styles.error}>{p.lastNameError}</span>
                                                </td>
                                            </tr>
                                            {
                                                contactPersons.length != 1 &&
                                                <tr>
                                                    <td style={{width: '180px'}}></td>
                                                    <td colSpan={2}>
                                                        <button className={styles.buttonSecondary} data-id={p.id} style={{width: '400px'}} onClick={removeContactPersonClick}>Remove</button>  
                                                    </td>
                                                </tr>
                                            }
                                            {
                                                index == contactPersons.length-1 &&
                                                <tr>
                                                    <td style={{width: '180px'}}></td>
                                                    <td colSpan={2}>
                                                        <button className={styles.buttonPrimary} style={{width: '400px'}} onClick={addContactPersonClick}>Add another contact person</button>  
                                                    </td>
                                                </tr>
                                            }   
                                        </tbody>
                                    </table>
                                )
                            }
                            {
                                isAddingSupplier &&
                                <p>Please wait while we're processing your request...</p>
                            }
                            {
                                requestHasError &&
                                <div className={`${styles.errorBorder} ${styles.error}`}>We're unable to process your request</div>
                            }
                     
                            <br/>
                            <table style={{maxWidth: '800px'}}>
                                <tbody>
                                    <tr>
                                        <td style={{width: '180px'}}>
                                            <button className={styles.buttonSecondary} onClick={e => { setView(VIEWS.LIST) }}>Cancel</button>
                                        </td>
                                        <td>
                                            <div style={{width: '400px', textAlign: 'right'}}>
                                                <button className={styles.buttonPrimary} onClick={saveClick}>Save</button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
            case VIEWS.EDIT:
                return  <div className={styles.supplierContent}>
                            <div className={styles.row} style={{alignItems: 'center'}}>
                                <h2>Edit Supplier</h2>
                            </div>
                            <div className={styles.hr}></div>
                            <table style={{maxWidth: '800px'}}>
                                <tbody>
                                    <tr>
                                        <td style={{width: '180px'}}>Supplier Name</td>
                                        <td>
                                            <input readOnly={isUpdatingSupplier} type="text" value={supplierName} style={{width: '400px'}} onChange={e => setSupplierName(e.currentTarget.value)} />
                                            <br/>
                                            <span className={styles.error}>{supplierNameError}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{width: '180px'}}>Address</td>
                                        <td>
                                            <textarea readOnly={isUpdatingSupplier} style={{width: '400px', resize: 'none'}}  value={address} onChange={e => setAddress(e.currentTarget.value)}></textarea>
                                            <br/>
                                            <span className={styles.error}>{addressError}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2}>
                                            <strong>Contact Persons</strong>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            {
                                contactPersons.map((p,index) =>
                                    <table style={{maxWidth: '580px'}} key={p.id}>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <span style={{width: '180px'}}>Name</span>
                                                </td>
                                                <td>
                                                    <input readOnly={isUpdatingSupplier} data-id={p.id} placeholder="First name" name="firstName" type="text" value={p.firstName} style={{width: '200px'}} onChange={changeContactPersonItem} />
                                                    <br/>
                                                    <span className={styles.error}>{p.firstNameError}</span>
                                                </td>
                                                <td>
                                                    <input readOnly={isUpdatingSupplier} data-id={p.id} placeholder="Last name" name="lastName" type="text" value={p.lastName} style={{width: '200px'}} onChange={changeContactPersonItem} />
                                                    <br/>
                                                    <span className={styles.error}>{p.lastNameError}</span>
                                                </td>
                                            </tr>
                                            {
                                                contactPersons.length != 1 &&
                                                <tr>
                                                    <td style={{width: '180px'}}></td>
                                                    <td colSpan={2}>
                                                        <button className={styles.buttonSecondary} data-id={p.id} style={{width: '400px'}} onClick={removeContactPersonClick}>Remove</button>  
                                                    </td>
                                                </tr>
                                            }
                                            {
                                                index == contactPersons.length-1 &&
                                                <tr>
                                                    <td style={{width: '180px'}}></td>
                                                    <td colSpan={2}>
                                                        <button className={styles.buttonPrimary} style={{width: '400px'}} onClick={addContactPersonClick}>Add another contact person</button>  
                                                    </td>
                                                </tr>
                                            }
                                        </tbody>
                                    </table>
                                )
                            }
                            {
                                isUpdatingSupplier &&
                                <p>Please wait while we're processing your request...</p>
                            }
                            {
                                requestHasError &&
                                <div className={`${styles.errorBorder} ${styles.error}`}>We're unable to process your request</div>
                            }
                    
                            <br/>
                            <table style={{maxWidth: '800px'}}>
                                <tbody>
                                    <tr>
                                        <td style={{width: '180px'}}>
                                            <button className={styles.buttonSecondary} onClick={e => { setView(VIEWS.LIST) }}>Discard changes</button>
                                        </td>
                                        <td>
                                            <div style={{width: '400px', textAlign: 'right'}}>
                                                <button className={styles.buttonPrimary} onClick={updateClick}>Update</button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
        }
    }

}

export default Approver;