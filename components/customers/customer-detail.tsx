"use client";

import { useState } from "react";
import { CustomerEditForm } from "./customer-edit-form";
import { CustomerDetailEmpty, CustomerView } from "./customer-view";
import type { CustomerRow } from "@/types/customer";
import "./customer-detail.css";

interface CustomerDetailProps {
  customer: CustomerRow;
  onMutated: (newSelId?: string) => void;
}

export function CustomerDetail({ customer, onMutated }: CustomerDetailProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="cdm-detail">
        <CustomerEditForm
          customer={customer}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            onMutated(customer.id);
          }}
          onDeleted={() => onMutated(undefined)}
        />
      </div>
    );
  }

  return (
    <div className="cdm-detail">
      <CustomerView
        customer={customer}
        onEdit={() => setIsEditing(true)}
        onMutated={onMutated}
      />
    </div>
  );
}

export { CustomerDetailEmpty };
