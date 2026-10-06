"use client";

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ServiceLocationInput } from "@/types/service-location";
import "./service-location-field.css";

interface ServiceLocationFieldProps {
  location: ServiceLocationInput | null;
  onEdit: () => void;
  onRemove: () => void;
}

export function ServiceLocationField({ location, onEdit, onRemove }: ServiceLocationFieldProps) {
  const t = useTranslations("ServiceLocation");
  const address = location ? [
    [location.street, location.houseNumber].filter(Boolean).join(" "),
    [location.postcode, location.city].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ") : "";

  return (
    <section className="service-location" aria-labelledby="service-location-title">
      <div className="service-location__heading">
        <span className="service-location__icon"><MapPin size={22} aria-hidden /></span>
        <div className="service-location__copy">
          <h2 id="service-location-title">{t("title")}</h2>
          <p>{t("hint")}</p>
        </div>
        <span className="service-location__optional">{t("optional")}</span>
      </div>
      {location ? (
        <div className="service-location__selected">
          <div className="service-location__address" dir="auto">
            {location.name && <strong>{location.name}</strong>}
            {address && <span>{address}</span>}
            {location.addressExtra && <span>{location.addressExtra}</span>}
          </div>
          <div className="service-location__actions">
            <button type="button" onClick={onEdit}>
              <Pencil size={17} aria-hidden />{t("edit")}
            </button>
            <button type="button" onClick={onRemove}>
              <Trash2 size={17} aria-hidden />{t("remove")}
            </button>
          </div>
        </div>
      ) : (
        <button className="service-location__add" type="button" onClick={onEdit}>
          <Plus size={20} aria-hidden />{t("add")}
        </button>
      )}
    </section>
  );
}
