import React, { useCallback, useState } from 'react';
import { Controller, FieldArrayWithId, Noop, RefCallBack, UseFieldArrayRemove, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Add, TrashCan } from '@carbon/react/icons';
import { Button, Dropdown, NumberInput, NumberInputSkeleton, TextInput } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import styles from './payment-form.scss';
import { usePaymentModes } from '../../../billing.resource';
import { PaymentFormValue, PaymentMethod } from '../../../types';
import { useParams } from 'react-router-dom';
import { usePatientInsuranceScheme } from '../payments.resource';

type PaymentFormProps = {
  disablePayment: boolean;
  amountDue: number;
  append: (obj: { method: PaymentMethod; amount: number; referenceCode: string }) => void;
  fields: FieldArrayWithId<PaymentFormValue, 'payment', 'id'>[];
  remove: UseFieldArrayRemove;
};

const PaymentForm: React.FC<PaymentFormProps> = ({ disablePayment, amountDue, append, remove, fields }) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
    setFocus,
    getValues,
  } = useFormContext<PaymentFormValue>();
  const { patientUuid } = useParams();
  const { insurance } = usePatientInsuranceScheme(patientUuid);
  const excludeInsurance = !(insurance?.hasInsurance ?? false);
  const { paymentModes, isLoading, error } = usePaymentModes(true, excludeInsurance, {
    uuid: 'beac329b-f1dc-4a33-9e7c-d95821a137a6',
    label: 'Insurance',
  });

  const shouldShowReferenceCode = (index: number) => {
    const formValues = getValues();
    const attributes = formValues?.payment?.[index]?.method?.attributeTypes ?? [];
    return attributes.some((attribute) => attribute.required) || attributes?.length > 0;
  };

  const handleAppendPaymentMode = useCallback(() => {
    append({ method: null, amount: 0, referenceCode: '' });
    setFocus(`payment.${fields.length}.method`);
  }, [append, fields.length, setFocus]);

  const handleRemovePaymentMode = useCallback((index) => remove(index), [remove]);

  if (isLoading) {
    return <NumberInputSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.errorPaymentContainer}>
        <ErrorState headerTitle={t('errorLoadingPaymentModes', 'Payment modes error')} error={error} />
      </div>
    );
  }

  const handlePaymentAmount = (
    e: { target: { value: any } },
    field: {
      onChange: any;
      onBlur?: Noop;
      value?: string | number;
      disabled?: boolean;
      name?: `payment.${number}.amount`;
      ref?: RefCallBack;
    },
  ) => {
    field.onChange(Number(e.target.value));
  };

  return (
    <div className={styles.container}>
      {fields.map((field, index) => (
        <div key={field.id} className={styles.paymentMethodContainer}>
          <Controller
            control={control}
            name={`payment.${index}.method`}
            render={({ field }) => (
              <Dropdown
                {...field}
                id="paymentMethod"
                onChange={({ selectedItem }) => {
                  setFocus(`payment.${index}.amount`);
                  field.onChange(selectedItem);
                }}
                titleText={t('paymentMethod', 'Payment method')}
                label={t('selectPaymentMethod', 'Select payment method')}
                items={paymentModes}
                itemToString={(item) => (item ? item.name : '')}
                invalid={!!errors?.payment?.[index]?.method}
                invalidText={errors?.payment?.[index]?.method?.message}
              />
            )}
          />
          <Controller
            control={control}
            name={`payment.${index}.amount`}
            render={({ field }) => (
              <NumberInput
                {...field}
                id="paymentAmount"
                onChange={(e) => handlePaymentAmount(e, field)}
                invalid={!!errors?.payment?.[index]?.amount}
                invalidText={errors?.payment?.[index]?.amount?.message}
                label={t('amount', 'Amount')}
                placeholder={t('enterAmount', 'Enter amount')}
              />
            )}
          />
          {shouldShowReferenceCode(index) && (
            <Controller
              name={`payment.${index}.referenceCode`}
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  id="paymentReferenceCode"
                  labelText={t('referenceNumber', 'Reference number')}
                  placeholder={t('enterReferenceNumber', 'Enter ref. number')}
                  type="text"
                  invalid={!!errors?.payment?.[index]?.referenceCode}
                  invalidText={errors?.payment?.[index]?.referenceCode?.message}
                />
              )}
            />
          )}
          <div className={styles.removeButtonContainer}>
            <TrashCan onClick={() => handleRemovePaymentMode(index)} className={styles.removeButton} size={20} />
          </div>
        </div>
      ))}
      <Button
        disabled={disablePayment}
        size="md"
        onClick={handleAppendPaymentMode}
        className={styles.paymentButtons}
        renderIcon={(props) => <Add size={24} {...props} />}
        iconDescription="Add">
        {t('addPaymentOptions', 'Add payment option')}
      </Button>
    </div>
  );
};

export default PaymentForm;
