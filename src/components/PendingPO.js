import * as React from 'react';
import styles from './StcPo.module.scss';
import {useState,useRef,useEffect,useContext} from "react";
import numeral from 'numeral';
import axios from "axios";
import { SERVER, POStatus, PO_PENDING_VIEWS, MENU_ID, CURRENCY } from '../utils/constant';
import EditPO from './EditPO';
import ViewPO from './ViewPO';
import * as moment from 'moment';
import {AppContext} from './StcPo';
import { convertApproverNameToInitials } from '../utils/utils';

const VIEWS = {
    LIST: 1,
    ITEM: 2
};

const HEADER = {
    PO_NUMBER: 1,
    REFERENCE_NUMBER: 2,
    SUPPLIER: 3,
    CONTACT: 4,
    CREATOR: 5,
    APPROVER: 6,
    STATUS: 7,
    TOTAL: 8,
    CREATED_ON: 9,
    CUSTOMER: 10,
    APPROVED_ON: 11,
    RECEIVED_ON: 12,
    CANCELLED_ON: 13,
    CURRENCY: 14,
};

const FILTER = {
    APPROVED: 0,
    RECEIVED: 1,
    CANCELLED: 2,
    CURRENCY: 3
};

let allPo = [];

//this variable will get all the PO in current view
//for the purpose of sending it to server to request an update of status
let POinCurrentView = [];

const PendingPO = (props) => {

    const context = useContext(AppContext);
    const [isLoading,setLoading] = useState(true);
    const [pO,setPO] = useState([]);
    const [selectedPO,setSelectedPO] = useState();
    const [view,setView] = useState(VIEWS.LIST);
    const [currentSelectedHeader,setCurrentSelectedHeader] = useState(HEADER.PO_NUMBER);
    const [ascOrder,setAscOrder] = useState(false);
    const [approvedFilter,setApprovedFilter] = useState("all");
    const [receivedFilter,setReceivedFilter] = useState("all");
    const [cancelledFilter,setCancelledFilter] = useState("all");
    const [currencyFilter,setCurrencyFilter] = useState("all");
    const [filterBy,setFilterBy] = useState([]);

    const [keyword,setKeyword] = useState("");
    const [searchType,setSearchType] = useState("PO #");

    const [skip,setSkip] = useState(0);
    const take = 50;
    const [isThrereMore,setIsThrereMore] = useState(true);
    const [isLoadMoreLoading,setIsLoadMoreLoading] = useState(false);

    const [prevItems,setPrevItems] = useState([]);
    const [isUserSearch,setIsUserSearch] = useState(false);

    useEffect(() => {
        loadData();
    },[]);


    //for background process to update items in the list
    useEffect(() => {

        let itemStatusChecker = setInterval(async () => {
            let ids = [];

            POinCurrentView.forEach(p => {
                ids.push(p.id);
            });

    
            await axios.post(`${SERVER}/po/statuses`,{ pOids: ids})
                .then(response => {


                    setPO(prev =>{ 
                        let tmp = [];
                        //copy the data
                        Object.assign(tmp,prev);

                        tmp.forEach(p => {
                            //get the item in the list of updated PO Status
                            let pTmp = response.data.filter(i => i.id == p.id)[0];

                            if (pTmp != undefined) {

                                //update the status
                                if (p.approvedOn != undefined && pTmp.approvedOn != undefined) {
                                    p.approvedOn = pTmp.approvedOn;
                                }

                                if (p.cancelledOn != undefined && pTmp.cancelledOn != undefined) {
                                    p.cancelledOn = pTmp.cancelledOn;
                                }

                                if (p.receivedOn != undefined && pTmp.receivedOn != undefined) {
                                    p.receivedOn = pTmp.receivedOn;
                                }

                            }



                        });

                        return tmp;
                    });
                })
                .catch(error => {
                    console.log(error);
                });
        }, 1000 * 30);

        return () => {
            clearInterval(itemStatusChecker);
        }

    }, []);

    const loadMore = () => {
        setIsLoadMoreLoading(true);
        let s = skip+take;
        setSkip(s);
        
        axios.get(`${SERVER}/po?skip=${s}&take=${take}`)
        .then(response => {

            let tmp = response.data;

            if (tmp.length == 0 || tmp.length < take) {
                setIsThrereMore(false);
            }

            let po = pO.concat(JSON.parse(JSON.stringify(tmp)));

            // po.sort((a,b) => {
            //     if (a.id < b.id) {
            //         return 1;
            //     }

            //     if (a.id > b.id) {
            //         return -1;
            //     }
            //     return 0;
            // });

            allPo = po;

            setPO(po);
            POinCurrentView = po;
            setIsLoadMoreLoading(false);
            setPrevItems(JSON.parse(JSON.stringify(po)));
        })
        .catch(error => {
            console.log(error);
            setIsLoadMoreLoading(false);
        });
        
    }

    const loadData = () => {
        setLoading(true);
        axios.get(`${SERVER}/po?skip=${skip}&take=${take}`)
            .then(response => {

                let tmp = response.data;
                // tmp.sort((a,b) => {
                // if (a.id < b.id) {
                //     return 1;
                // }
    
                // if (a.id > b.id) {
                //     return -1;
                // }

                // return 0;
                // });

                allPo = JSON.parse(JSON.stringify(tmp));
                setPO(tmp);
                setPrevItems(JSON.parse(JSON.stringify(tmp)));
                POinCurrentView = tmp;
                setLoading(false);
            })
            .catch(error => {
                console.log(error);
                setLoading(false);
            });
    };

    const onPendingPOItemClick = (e) => {
        let id = Number(e.currentTarget.getAttribute('data-id'));
        let tmpPO = pO.filter(i => i.id == id)[0];
        
        if (tmpPO.status == POStatus.indexOf("Draft")) {
            let t = JSON.parse(tmpPO.poPendingItemsJsonString);
            tmpPO.poPendingItems = t;
        }

        tmpPO.poPendingItems = tmpPO.poPendingItems.sort(function (a, b) {
            return a.order - b.order;
          });

        setSelectedPO(tmpPO);
        // setView(VIEWS.ITEM);
        context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.ITEM});

    };

    const onHeaderClick = (e) => {
        let header = e.currentTarget.getAttribute("data-header");
        sortAllColumns(header, pO, true);
    };

    const filterChange = (e) => {
        let filterType = Number(e.currentTarget.getAttribute("data-filter"));
        let value = e.currentTarget.value;

        let tmpFilter = JSON.parse(JSON.stringify(filterBy));
        switch(filterType) {
            case FILTER.APPROVED:
                setApprovedFilter(value);
                if (value == "all") {
                    tmpFilter = tmpFilter.filter(v => v != FILTER.APPROVED);
                } else {
                    if (tmpFilter.indexOf(FILTER.APPROVED) == -1) {
                        tmpFilter.push(FILTER.APPROVED);
                    }
                }
                break;
            case FILTER.RECEIVED:
                setReceivedFilter(value);
                if (value == "all") {
                    tmpFilter = tmpFilter.filter(v => v != FILTER.RECEIVED);
                } else {
                    if (tmpFilter.indexOf(FILTER.RECEIVED) == -1) {
                        tmpFilter.push(FILTER.RECEIVED);
                    }
                }
                break;
            case FILTER.CANCELLED:
                    setCancelledFilter(value);
                    if (value == "all") {
                        tmpFilter = tmpFilter.filter(v => v != FILTER.CANCELLED);
                    } else {
                        if (tmpFilter.indexOf(FILTER.CANCELLED) == -1) {
                            tmpFilter.push(FILTER.CANCELLED);
                        }
                    }
                break;
            case FILTER.CURRENCY:
                    setCurrencyFilter(value);
                    if (value == "all") {
                        tmpFilter = tmpFilter.filter(v => v != FILTER.CURRENCY);
                    } else {
                        if (tmpFilter.indexOf(FILTER.CURRENCY) == -1) {
                            tmpFilter.push(FILTER.CURRENCY);
                        }
                    }
                break;
        };

        
        setFilterBy(tmpFilter);
    }

    useEffect( () => {
        //if user did not search use all the data
        if (keyword.trim() == "") {
            filterList(filterBy,allPo);
        } else {
            //if user had search, get the search result then filter
            let tmp = searchPO(keyword.trim(), allPo);
            filterList(filterBy,tmp);
        }
    }, [filterBy]);

    //triggerChangeOrder - some call dont need to change or order setting like call from filter
    const sortAllColumns = (columnHeaderToSort, itemsToSort, triggerChangeOrder) => {
        let asc = ascOrder;
        //if the order is ascending it will change to descending
        //if the order is descending it will change to ascending
        if (triggerChangeOrder) {
            asc = !ascOrder;
        }
        let tmp = itemsToSort;
        tmp.sort((a,b) => {
            let value1;
            let value2;

            switch(Number(columnHeaderToSort)) {
                case HEADER.PO_NUMBER:
                        setCurrentSelectedHeader(HEADER.PO_NUMBER);
                        value1 = a.orderNumber;
                        value2 = b.orderNumber;
                    break;
                case HEADER.REFERENCE_NUMBER:
                        setCurrentSelectedHeader(HEADER.REFERENCE_NUMBER);
                        value1 = a.referenceNumber != null ? a.referenceNumber.toUpperCase() : "";
                        value2 = b.referenceNumber != null ? b.referenceNumber.toUpperCase() : "";
                    break;
                case HEADER.SUPPLIER:
                        setCurrentSelectedHeader(HEADER.SUPPLIER);
                        if (a.supplierName == null) {
                            value1 = "";
                        } else {
                            value1 = a.supplierName.toUpperCase();
                        }

                        if (b.supplierName == null) {
                            value2 = "";
                        } else {
                            value2 = b.supplierName.toUpperCase();
                        }

                    break;
                case HEADER.CONTACT:
                        setCurrentSelectedHeader(HEADER.CONTACT);
                        value1 = a.contactPersonName.toUpperCase();
                        value2 = b.contactPersonName.toUpperCase();
                    break;
                case HEADER.CREATOR:
                        setCurrentSelectedHeader(HEADER.CREATOR);
                        value1 = a.createdByName.toUpperCase();
                        value2 = b.createdByName.toUpperCase();
                    break;
                case HEADER.APPROVER:
                        setCurrentSelectedHeader(HEADER.APPROVER);
                        value1 = a.approverName.toUpperCase();
                        value2 = b.approverName.toUpperCase();
                    break;
                case HEADER.STATUS:
                        setCurrentSelectedHeader(HEADER.STATUS);
                        value1 = POStatus[a.status].toUpperCase();
                        value2 = POStatus[b.status].toUpperCase();
                    break;
                case HEADER.TOTAL:
                        setCurrentSelectedHeader(HEADER.TOTAL);
                        value1 = a.total;
                        value2 = b.total;
                    break;
                case HEADER.CREATED_ON:
                    setCurrentSelectedHeader(HEADER.CREATED_ON);
                    let tmp1 = moment.parseZone(a.createdOn).format('M/D/YYYY').split('/');
                    let tmp2 = moment.parseZone(b.createdOn).format('M/D/YYYY').split('/');
                    //Month in js is from 0 - 11
                    //so you need to minus 1
                    new Date()
                    value1 = new Date(tmp1[2],tmp1[0]-1,tmp1[1]);
                    value2 = new Date(tmp2[2],tmp2[0]-1,tmp2[1]);
                    break;
                case HEADER.CUSTOMER:
                    setCurrentSelectedHeader(HEADER.CUSTOMER);
                    value1 = a.customerName;
                    value2 = b.customerName;
                    break;
                case HEADER.APPROVED_ON:
                    setCurrentSelectedHeader(HEADER.APPROVED_ON);
                    
                    if (a.approvedOn == null) {
                        //just put a very old date
                        value1 = new Date(1989,1,1);
                    } else {
                        let tmp1 = moment.parseZone(a.approvedOn).format('M/D/YYYY').split('/');
                        value1 = new Date(tmp1[2],tmp1[0]-1,tmp1[1]);
                    }

                    if (b.approvedOn == null) {
                        //just put a very old date
                        value2 = new Date(1989,1,1);
                    } else {
                        let tmp2 = moment.parseZone(b.approvedOn).format('M/D/YYYY').split('/');
                        value2 = new Date(tmp2[2],tmp2[0]-1,tmp2[1]);
                    }

                    break;
                case HEADER.RECEIVED_ON:
                    setCurrentSelectedHeader(HEADER.RECEIVED_ON);
                    
                    if (a.receivedOn == null) {
                        //just put a very old date
                        value1 = new Date(1989,1,1);
                    } else {
                        let tmp1 = moment.parseZone(a.receivedOn).format('M/D/YYYY').split('/');
                        value1 = new Date(tmp1[2],tmp1[0]-1,tmp1[1]);
                    }

                    if (b.receivedOn == null) {
                        //just put a very old date
                        value2 = new Date(1989,1,1);
                    } else {
                        let tmp2 = moment.parseZone(b.receivedOn).format('M/D/YYYY').split('/');
                        value2 = new Date(tmp2[2],tmp2[0]-1,tmp2[1]);
                    }
                    break;
                case HEADER.CANCELLED_ON:
                    setCurrentSelectedHeader(HEADER.CANCELLED_ON);
                    
                    if (a.cancelledOn == null) {
                        //just put a very old date
                        value1 = new Date(1989,1,1);
                    } else {
                        let tmp1 = moment.parseZone(a.cancelledOn).format('M/D/YYYY').split('/');
                        value1 = new Date(tmp1[2],tmp1[0]-1,tmp1[1]);
                    }

                    if (b.cancelledOn == null) {
                        //just put a very old date
                        value2 = new Date(1989,1,1);
                    } else {
                        let tmp2 = moment.parseZone(b.cancelledOn).format('M/D/YYYY').split('/');
                        value2 = new Date(tmp2[2],tmp2[0]-1,tmp2[1]);
                    }

                    break;
            }

            if (value1 < value2) {
                return asc ? -1 : 1;
            }

            if (value1 > value2) {
                return asc ? 1 : -1;
            }

        return 0;
        });

        setPO(tmp);
        setAscOrder(asc);
    }

    const filterList = (filterData, data) => {
        let tmp = JSON.parse(JSON.stringify(data));
        filterData.forEach(item => {

            switch(item) {
                case FILTER.APPROVED:
                    switch(approvedFilter) {
                        case "no":
                            tmp = tmp.filter(i => i.approvedOn == null);
                            break;
                        case "yes":
                            tmp = tmp.filter(i => i.approvedOn != null);
                            break;
                    }
                    break;
                case FILTER.RECEIVED:
                        switch(receivedFilter) {
                            case "no":
                                tmp = tmp.filter(i => i.receivedOn == null);
                                break;
                            case "yes":
                                tmp = tmp.filter(i => i.receivedOn != null);
                                break;
                        }
                    break;
                case FILTER.CANCELLED:
                        switch(cancelledFilter) {
                            case "no":
                                tmp = tmp.filter(i => i.cancelledOn == null);
                                break;
                            case "yes":
                                tmp = tmp.filter(i => i.cancelledOn != null);
                                break;
                        }
                    break;
                case FILTER.CURRENCY:
                        if (currencyFilter != "all") {
                            tmp = tmp.filter(i => i.currency == currencyFilter);
                        }
                    break;
            };

        });

        //this will sort all columns then updated the value
        sortAllColumns(currentSelectedHeader,tmp,false);
    }

    const updateItemInPOAllList = (itemToUpdate) => {
         //convert the list
         let tmpList = JSON.parse(JSON.stringify(allPo));
         //remove the old item
         tmpList = tmpList.filter(i => i.id != itemToUpdate.id);
         //add the updated item
         tmpList.unshift(itemToUpdate);
         //update the list
         allPo = tmpList;
    };

    const getTotalByCurrentCurrency = () => {
        return pO.reduce((total, p) => { return total + p.total}, 0);
    }

    // const onChangeSearch = (e) => {
    //     let value = e.currentTarget.value;
    //     setKeyword(value);
    //     let tmp = searchPO(value.trim(), allPo);
    //     setPO(tmp);
    //     filterList(filterBy, tmp);
    // }

    const onSearch = () => {
        setIsUserSearch(true);
        setLoading(true);
        axios.get(`${SERVER}/po/search?keyword=${keyword}&searchType=${searchType}`)
            .then(response => {
                let tmp = response.data;

                allPo = JSON.parse(JSON.stringify(tmp));
                setPO(tmp);
                POinCurrentView = tmp;
                setLoading(false);

            })
            .catch(error => {

                console.log(error);
                setLoading(false);

            });

    }

    const clearResult = () => {
        setPO(prevItems);
        setIsUserSearch(false);
        setKeyword("");
    }

    const searchPO = (keywordParam, data) => {
        let tmp = JSON.parse(JSON.stringify(data));
        switch(searchType) {
            case "PO":
                tmp = tmp.filter(i => String(i.orderNumber).toUpperCase().indexOf(keywordParam.toUpperCase()) != -1);
                break;
            case "Supplier":
                tmp = tmp.filter(i => i.supplierName.toUpperCase().indexOf(keywordParam.toUpperCase()) != -1);
                break;
            case "Customer":
                tmp = tmp.filter(i => i.customerName.toUpperCase().indexOf(keywordParam.toUpperCase()) != -1);
                break;
            case "Reference":
                tmp = tmp.filter(i => String(i.referenceNumber).toUpperCase().indexOf(keywordParam.toUpperCase()) != -1);
                break;
        }

        return tmp;
    }


    if (isLoading) {
        return <div className={styles.pOList}>
            <p>Fetching items, please wait...</p>
        </div>
    } else {

        if (context.state.pOPendingView == PO_PENDING_VIEWS.LIST) {
            return <div className={styles.pOList}>
                <h2>Purchase Orders</h2>
                <div className={styles.hr}></div>
                <div className={styles.row}>
                    <div className={styles.row} style={{alignItems: 'center'}}>
                        <label style={{marginRight: '10px'}}>
                            <strong>Search:</strong>
                        </label>
                        <input type="text" placeholder="Type the keyword..." value={keyword} onChange={e => setKeyword(e.currentTarget.value)}  />
                        <select value={searchType} onChange={e => setSearchType(e.currentTarget.value)}>
                            <option value="PO">PO #</option>
                            <option value="Supplier">Supplier</option>
                            <option value="Customer">Customer</option>
                            <option value="Reference">Reference #</option>
                        </select>
                        <button style={{marginLeft: '10px', marginRight: '10px'}} className={styles.buttonPrimary} onClick={onSearch}>Search</button>
                        {
                            isUserSearch &&
                            <button className={styles.buttonSecondary} onClick={clearResult}>Clear Search Result</button>
                        }
                    </div>
                    <div className={styles.row} style={{marginLeft: 'auto', alignItems: 'center'}}>
                        <div style={{marginRight: '10px'}}>
                            <label>
                                <strong>Filters:</strong>
                            </label>
                        </div>
                        <div>
                            <label style={{marginRight: '10px'}}>Currency</label>
                            <select data-filter={FILTER.CURRENCY} value={currencyFilter} onChange={filterChange}>
                                <option value="all">All</option>
                                {
                                    CURRENCY.map(c => <option key={c.id} value={c.symbol}>{c.code} - {c.symbol}</option>)
                                }
                            </select>
                        </div>
                        <div style={{marginLeft: '10px'}}>
                            <label style={{marginRight: '10px'}}>Approved</label>
                            <select data-filter={FILTER.APPROVED} value={approvedFilter} onChange={filterChange}>
                                <option value="all">All</option>
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </div>
                        <div style={{marginLeft: '10px'}}>
                            <label style={{marginRight: '10px'}}>Received</label>
                            <select data-filter={FILTER.RECEIVED} value={receivedFilter} onChange={filterChange}>
                                <option value="all">All</option>
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </div>
                        <div style={{marginLeft: '10px'}}>
                            <label style={{marginRight: '10px'}}>Cancelled</label>
                            <select data-filter={FILTER.CANCELLED} value={cancelledFilter} onChange={filterChange}>
                                <option value="all">All</option>
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </div>
                    </div>
                </div>
                <br/>
                <table className={`${styles.tableListView} ${styles.tableRowClickable}`}>
                    <thead>
                        <tr>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.PO_NUMBER} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>PO #</span>
                                    {
                                        currentSelectedHeader == HEADER.PO_NUMBER &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }                                    
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.CREATED_ON} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Created</span>
                                    {
                                        currentSelectedHeader == HEADER.CREATED_ON &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.SUPPLIER} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Supplier</span>
                                    {
                                        currentSelectedHeader == HEADER.SUPPLIER &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.CUSTOMER} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Customer</span>
                                    {
                                        currentSelectedHeader == HEADER.CUSTOMER &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.REFERENCE_NUMBER} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Reference #</span>
                                    {
                                        currentSelectedHeader == HEADER.REFERENCE_NUMBER &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.CURRENCY} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Currency</span>
                                    {
                                        currentSelectedHeader == HEADER.CURRENCY &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            {/* <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.CONTACT} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Contact</span>
                                    {
                                        currentSelectedHeader == HEADER.CONTACT &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.CREATOR} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Creator</span>
                                    {
                                        currentSelectedHeader == HEADER.CREATOR &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td> */}
                            {/* <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.APPROVER} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Approver</span>
                                    {
                                        currentSelectedHeader == HEADER.APPROVER &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td> */}
                            {/* <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.STATUS} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Status</span>
                                    {
                                        currentSelectedHeader == HEADER.STATUS &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td> */}
                            <td style={{cursor: 'pointer'}} data-header={HEADER.TOTAL} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    {
                                        currentSelectedHeader == HEADER.TOTAL &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                    <span style={{marginLeft: 'auto'}}>Total</span>
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.APPROVED_ON} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Approved</span>
                                    {
                                        currentSelectedHeader == HEADER.APPROVED_ON &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.RECEIVED_ON} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Received</span>
                                    {
                                        currentSelectedHeader == HEADER.RECEIVED_ON &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                            <td style={{cursor: 'pointer', paddingRight: '20px'}} data-header={HEADER.CANCELLED_ON} onClick={onHeaderClick}>
                                <div className={styles.row} style={{alignItems: 'center'}}>
                                    <span>Cancelled</span>
                                    {
                                        currentSelectedHeader == HEADER.CANCELLED_ON &&
                                        <div className={ascOrder ? styles.arrow_up : styles.arrow_down}></div>
                                    }
                                </div>
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            pO.map(i => <tr key={i.id} data-id={i.id} onClick={onPendingPOItemClick}>
                                <td>{i.orderNumber}</td>
                                <td>{moment.parseZone(i.createdOn).format('MM/DD/YYYY')}</td>
                                <td className={styles.truncateText}>
                                    <div className={styles.truncateText} style={{maxWidth: '250px'}}>
                                        {i.supplierName}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.truncateText} style={{maxWidth: '250px'}}>
                                        {i.customerName}
                                    </div>
                                </td>
                                <td>{i.referenceNumber}</td>
                                {/* <td>{i.approverName}</td> */}
                                {/* <td>{POStatus[i.status]}</td> */}
                                <td style={{textAlign: 'right', fontWeight: 'bold'}}>{i.currency}</td>
                                <td className={styles.numbers} style={{textAlign: 'right', fontWeight: 'bold'}}>{`${numeral(Number( i.total )).format('0,0.00')}`}</td>
                                <td>{i.approvedOn != null && `${moment.parseZone(i.approvedOn).format('MM/DD/YYYY')} - ${convertApproverNameToInitials(i.approverName,context.state.approvers)}`}</td>
                                <td>{i.receivedOn != null && moment.parseZone(i.receivedOn).format('MM/DD/YYYY')}</td>
                                <td>{i.cancelledOn != null && moment.parseZone(i.cancelledOn).format('MM/DD/YYYY')}</td>
                            </tr>)
                        }
                        {
                            currencyFilter != 'all' &&
                            <tr className={styles.tableRowNotClickable}>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td><strong>Total</strong></td>
                                <td style={{textAlign: 'right', fontWeight: 'bold'}}>{`${currencyFilter}${numeral(Number( getTotalByCurrentCurrency())).format('0,0.00')}`}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        }
                    </tbody>
                </table>

                <p style={{textAlign: 'center'}}>
                    {
                        (isThrereMore && !isLoadMoreLoading && !isUserSearch) &&
                        <button className={styles.buttonPrimary} onClick={loadMore}>Load More</button>
                    }
                    {
                        isLoadMoreLoading &&
                        <span>Fetching more items...</span>
                    }
                    {
                        isUserSearch &&
                        <span>Search result will take 100 items only</span>
                    }
                </p>

            </div>;
        } else if (context.state.pOPendingView == PO_PENDING_VIEWS.ITEM) {
           return <ViewPO selectedPO={selectedPO} pOList={pO} setPOList={setPO} updateItemInPOAllList={updateItemInPOAllList} />
        } else {
            return <EditPO data={selectedPO} loadData={loadData} />
        }
    }

}

export default PendingPO;
