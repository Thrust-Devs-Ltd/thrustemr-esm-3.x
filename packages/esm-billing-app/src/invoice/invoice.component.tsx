import { Button, InlineLoading } from '@carbon/react';
import { BaggageClaim, Printer, Wallet } from '@carbon/react/icons';
import {
  ExtensionSlot,
  formatDatetime,
  navigate,
  parseDate,
  setCurrentVisit,
  showModal,
  showSnackbar,
  updateVisit,
  useFeatureFlag,
  usePatient,
  useVisit,
} from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useBill, useGetCurrentDollarRate, useDefaultFacility } from '../billing.resource';
import { spaBasePath } from '../constants';
import { convertToCurrency } from '../helpers';
import { usePaymentsReconciler } from '../hooks/use-payments-reconciler';
import { LineItem, payloadVisa } from '../types';
import InvoiceTable from './invoice-table.component';
import { processVisaCardBillPayment, removeQueuedPatient, useVisitQueueEntry } from './invoice.resource';
import styles from './invoice.scss';
import Payments from './payments/payments.component';
import ReceiptPrintButton from './print-bill-receipt/receipt-print-button.component';
import PrintableInvoice from './printable-invoice/printable-invoice.component';

interface InvoiceDetailsProps {
  label: string;
  value: string | number;
}

const Invoice: React.FC = () => {
  const { t } = useTranslation();
  const { data: facilityInfo } = useDefaultFacility();
  const { data: exchangeRate } = useGetCurrentDollarRate();
  const { billUuid, patientUuid } = useParams();
  const [isPrinting, setIsPrinting] = useState(false);
  const { patient, isLoading: isLoadingPatient, error: patientError } = usePatient(patientUuid);
  const { bill, isLoading: isLoadingBill, error: billingError } = useBill(billUuid);
  let isVisible = false;
  /**
  const [visaCardPayload, setVisaCardPayload] = useState<payloadVisa>({
    PaymentAmount: bill.totalAmount,
    PaymentCurrency: 'UGX',
    DefaultPayment: 'CC',
    BackURL: 'https://www.hospicare.co.zw/openmrs/spa/home/billing',
  });

    **/
  usePaymentsReconciler(billUuid);
  const {
    currentVisit,
    isLoading: isVisitLoading,
    error: visitError,
    currentVisitIsRetrospective,
    mutate: mutateVisit,
  } = useVisit(patientUuid);
  const { queueEntry } = useVisitQueueEntry(patientUuid, currentVisit?.uuid);
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const componentRef = useRef<HTMLDivElement>(null);
  const isProcessClaimsFormEnabled = useFeatureFlag('healthInformationExchange');
  const handleSelectItem = (lineItems: Array<LineItem>) => {
    const paidLineItems = bill?.lineItems?.filter((item) => item.paymentStatus === 'PAID') ?? [];
    // remove duplicates
    const uniqueLineItems = [...new Set([...lineItems, ...paidLineItems])];
    setSelectedLineItems(uniqueLineItems);
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice ${bill?.receiptNumber} - ${patient?.name?.[0]?.given?.join(' ')} ${
      patient?.name?.[0].family
    }`,
    onBeforePrint() {
      setIsPrinting(true);
    },
    onAfterPrint() {
      setIsPrinting(false);
    },
    removeAfterPrint: true,
  });

  const handleBillPayment = () => {
    const dispose = showModal('initiate-payment-modal', {
      closeModal: () => dispose(),
      bill: bill,
    });
  };
  const handleVisaCardPayment = async () => {
    /** To..do **/
    // await processVisaCardBillPayment(visaCardPayload);
  };

  useEffect(() => {
    const paidLineItems = bill?.lineItems?.filter((item) => item.paymentStatus === 'PAID') ?? [];
    setSelectedLineItems(paidLineItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill?.lineItems?.length]);

  const invoiceDetails = {
    'Total Amount': convertToCurrency(bill?.totalAmount),
    'Amount Tendered': convertToCurrency(bill?.tenderedAmount),
    'Invoice Number': bill.receiptNumber,
    'Date And Time': formatDatetime(parseDate(bill.dateCreated), { mode: 'standard', noToday: true }),
    'Invoice Status': bill?.status,
  };

  if (isLoadingPatient || isLoadingBill || isVisitLoading) {
    return (
      <div className={styles.invoiceContainer}>
        <InlineLoading
          className={styles.loader}
          status="active"
          iconDescription="Loading"
          description="Loading patient header..."
        />
      </div>
    );
  }

  if (billingError || patientError || visitError) {
    return (
      <div className={styles.errorContainer}>
        <ErrorState
          headerTitle={t('invoiceError', 'Invoice error')}
          error={billingError ?? patientError ?? visitError}
        />
      </div>
    );
  }

  const handleEndVisit = async () => {
    if (currentVisitIsRetrospective) {
      setCurrentVisit(null, null);
    } else {
      const endVisitPayload = {
        stopDatetime: new Date(),
      };

      const abortController = new AbortController();

      try {
        const response = await updateVisit(currentVisit.uuid, endVisitPayload, abortController);

        if (queueEntry) {
          removeQueuedPatient(
            queueEntry.queue.uuid,
            queueEntry.queueEntryUuid,
            abortController,
            new Date(response?.data?.stopDatetime ?? Date.now()),
          );
        }

        mutateVisit();
        showSnackbar({
          isLowContrast: true,
          kind: 'success',
          subtitle: t('visitEndSuccessfully', `${response?.data?.visitType?.display} ended successfully`),
          title: t('visitEnded', 'Visit ended'),
        });
      } catch (error) {
        showSnackbar({
          title: t('errorEndingVisit', 'Error ending visit'),
          kind: 'error',
          isLowContrast: false,
          subtitle: error?.message || 'An error occurred',
        });
      }
    }
  };

  const handleViewClaims = async () => {
    if (currentVisit) {
      await handleEndVisit();
      navigate({ to: `${spaBasePath}/billing/invoice/${patientUuid}/${billUuid}/claims` });
    } else {
      navigate({ to: `${spaBasePath}/billing/invoice/${patientUuid}/${billUuid}/claims` });
    }
  };

  return (
    <div className={styles.invoiceContainer}>
      {patient && patientUuid && <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid }} />}
      <div className={styles.detailsContainer}>
        <section className={styles.details}>
          {Object.entries(invoiceDetails).map(([key, val]) => (
            <InvoiceDetails key={key} label={key} value={val} />
          ))}
        </section>
      </div>
      <div className={styles.actionArea}>
        <ReceiptPrintButton bill={bill} />
        <Button
          onClick={handlePrint}
          kind="tertiary"
          size="sm"
          disabled={isPrinting}
          renderIcon={Printer}
          iconDescription="Add"
          tooltipPosition="right">
          {isPrinting ? t('printingInvoice', 'Printing invoice...') : t('printInvoice', 'Print invoice')}
        </Button>
        <Button
          onClick={handleBillPayment}
          disabled={bill?.status === 'PAID'}
          style={{ display: isVisible ? 'inline-block' : 'none' }}
          size="sm"
          renderIcon={Wallet}
          iconDescription="Add"
          tooltipPosition="left">
          {t('echoCashPayment', 'Echo Cash Payment')}
        </Button>

        <Button
          onClick={handleVisaCardPayment}
          disabled={bill?.status === 'PAID'}
          size="sm"
          style={{ display: isVisible ? 'inline-block' : 'none' }}
          kind={'secondary'}
          renderIcon={Wallet}
          iconDescription="Add"
          tooltipPosition="left">
          {t('visaCardPayment', 'Echo Cash Payment')}
        </Button>
        {isProcessClaimsFormEnabled && (
          <Button
            onClick={handleViewClaims}
            disabled={bill?.status !== 'PAID'}
            kind="danger"
            size="sm"
            renderIcon={BaggageClaim}
            iconDescription="Add"
            tooltipPosition="bottom">
            {currentVisit ? t('endVisitAndClaim', 'End visit and Process claims') : t('claim', 'Process claims')}
          </Button>
        )}
      </div>

      <InvoiceTable bill={bill} isLoadingBill={isLoadingBill} onSelectItem={handleSelectItem} />
      <Payments bill={bill} selectedLineItems={selectedLineItems} />

      <div className={styles.printContainer}>
        <PrintableInvoice
          ref={componentRef}
          facilityInfo={facilityInfo}
          bill={bill}
          patient={patient}
          isPrinting={isPrinting}
        />
      </div>
    </div>
  );
};

function InvoiceDetails({ label, value }: InvoiceDetailsProps) {
  return (
    <div>
      <h1 className={styles.label}>{label}</h1>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export default Invoice;
