import * as React from "react";
import styles from './StcPo.module.scss';
import { Document, Page  } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';

const PreviewPDF = (props) => {

    return (
        <div className={styles.previewPDF}>
            <div className={styles.document}>
                <div className={`${styles.topBar} ${styles.row}`}>
                    <div onClick={e => { props.close() }} className={`${styles.link} ${styles.previewCloseBtn}`}>Close this preview</div>
                </div>
                {
                    props.pdf != null &&
                    <Document file={props.pdf} onLoadError={console.error} onLoadSuccess={() => { console.log('pdf loaded') }}>
                        {
                            props.pdfPagesNumbering.map(v => <Page width={1000} key={v} pageNumber={v} renderAnnotationLayer={true} renderInteractiveForms={true} /> )
                        }                        
                    </Document>
                }
            </div>
        </div>);
};

export default PreviewPDF;