import { Children, Fragment, isValidElement, type ReactNode } from "react";

export type SelectOption = { value: string; label: string; disabled?: boolean; group?: string; hidden?: boolean };
type OptionProps = { children?: ReactNode; value?: string | number; label?: string; disabled?: boolean; hidden?: boolean };
function text(node: ReactNode): string {
  return Children.toArray(node).map((child) => isValidElement<OptionProps>(child) ? text(child.props.children) : String(child)).join("");
}

/** Preserve option values, disabled groups, fragments, and numeric values. */
export function selectOptions(children: ReactNode, group?: string, disabled = false): SelectOption[] {
  return Children.toArray(children).flatMap((child): SelectOption[] => {
    if (!isValidElement<OptionProps>(child)) return [];
    if (child.type === Fragment) return selectOptions(child.props.children, group, disabled);
    if (child.type === "optgroup") return selectOptions(child.props.children, child.props.label, disabled || child.props.disabled);
    if (child.type !== "option") return [];
    const label = child.props.label ?? text(child.props.children);
    return [{ value: String(child.props.value ?? label), label, group, disabled: disabled || child.props.disabled, hidden: child.props.hidden }];
  });
}
