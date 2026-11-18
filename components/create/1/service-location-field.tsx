"use client";

import { History, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DocumentServiceLocation, ServiceLocationInput } from "@/types/service-location";
import "./service-location-field.css";

interface ServiceLocationFieldProps {
  location: ServiceLocationInput | null;
  /** Letzte Einsatzorte des gewählten Kunden – nur Vorschlag, nichts wird automatisch gesetzt. */
  suggestions: DocumentServiceLocation[];
  onEdit: () => void;
  onRemove: () => void;
  onPick: (location: DocumentServiceLocation) => void;
}

function formatAddress(location: Pick<ServiceLocationInput, "street" | "houseNumber" | "postcode" | "city">) {
  return [
    [location.street, location.houseNumber].filter(Boolean).join(" "),
    [location.postcode, location.city].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");
}

export function ServiceLocationField({
  location,
  suggestions,
  onEdit,
  onRemove,
  onPick,
}: ServiceLocationFieldProps) {
  const t = useTranslations("ServiceLocation");
  const address = location ? formatAddress(location) : "";

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
        <>
          {suggestions.length > 0 && (
            <div className="service-location__recent">
              <span className="service-location__recent-title">{t("recentTitle")}</span>
              {suggestions.map((suggestion) => {
                const suggestionAddress = formatAddress(suggestion);
                return (
                  <button
                    key={`${suggestion.name}|${suggestionAddress}`}
                    type="button"
                    className="service-location__recent-item"
                    onClick={() => onPick(suggestion)}
                  >
                    <History size={18} aria-hidden />
                    <span className="service-location__recent-text" dir="auto">
                      {suggestion.name && <strong>{suggestion.name}</strong>}
                      {suggestionAddress && <span>{suggestionAddress}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button className="service-location__add" type="button" onClick={onEdit}>
            <Plus size={20} aria-hidden />{suggestions.length > 0 ? t("addOther") : t("add")}
          </button>
        </>
      )}
    </section>
  );
}
