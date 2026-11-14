"use client";

import { useEffect, useId, useRef, useState, type SelectHTMLAttributes } from "react";
import { FilterSelect } from "./FilterSelect";
import { selectOptions } from "./select-options";

/** Form-compatible adapter. The native select is hidden and never opens a picker;
 * it only supplies FormData, reset, validation and real change-event semantics. */
export function CustomSelect({ children, value, defaultValue, className, id, autoFocus, onChange, onInvalid, ...props }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple"> & { multiple?: false }) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = selectOptions(children);
  const initial = String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  const [local, setLocal] = useState(initial);
  const [validation, setValidation] = useState("");
  const current = String(value ?? local);
  const selected = options.some((option) => option.value === current) ? current : options.find((option) => !option.disabled)?.value ?? "";

  useEffect(() => {
    const form = native.current?.form;
    if (!form) return;
    function reset() { setLocal(initial); setValidation(""); }
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [initial, props.form]);

  return <span className="custom-select-field">
    <FilterSelect variant="field" value={selected} options={options} disabled={props.disabled} triggerRef={trigger}
      triggerProps={{ id: triggerId, className, autoFocus, title: props.title, tabIndex: props.tabIndex,
        "aria-label": props["aria-label"], "aria-labelledby": props["aria-labelledby"],
        "aria-describedby": [props["aria-describedby"], validation ? `${triggerId}-error` : null].filter(Boolean).join(" ") || undefined,
        "aria-invalid": validation ? true : props["aria-invalid"], "aria-required": props.required,
      }}
      onChange={(next) => {
        const node = native.current;
        if (!node) return;
        node.value = next;
        node.dispatchEvent(new Event("change", { bubbles: true }));
      }} />
    <select {...props} ref={native} hidden aria-hidden="true" tabIndex={-1} id={`${triggerId}-value`}
      value={selected} onChange={(event) => {
        onChange?.(event);
        setLocal(event.currentTarget.value);
        setValidation("");
      }} onInvalid={(event) => {
        event.preventDefault();
        onInvalid?.(event);
        setValidation(event.currentTarget.validationMessage);
        trigger.current?.focus();
      }}>{children}</select>
    {validation ? <span id={`${triggerId}-error`} className="custom-select__error" role="alert">{validation}</span> : null}
  </span>;
}
