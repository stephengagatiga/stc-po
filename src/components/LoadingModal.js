import * as React from 'react';
import {useContext,useState,useRef,useEffect} from "react";
import styles from './StcPo.module.scss';
import {AppContext} from './StcPo';


const LoadingModal = (props) => {

    return <div className={styles.modal}>
                <div>
                    <div className={styles.header}>
                        <div>{props.title}</div>
                    </div>

                    <div className={styles.body}>
                        <div>
                            {
                                <p>{props.message}</p>
                            }
                            {
                                props.hasError &&
                                <p className={styles.error}>{props.errorMessage}</p>
                            }
                        </div>
                    </div>
                    <div className={styles.footer}>
                        {
                            props.done &&
                            <div>
                                <button className={styles.buttonPrimary} onClick={props.onClick}>{props.buttonText}</button>
                            </div>
                        }
                    </div>
                </div>
            </div>
};

export default LoadingModal;