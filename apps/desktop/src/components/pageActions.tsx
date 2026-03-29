import { Button, type ButtonProps } from "@/components/ui/button";

type PageActionProps = Omit<ButtonProps, "size" | "variant">;
type CompactPageActionProps = Omit<ButtonProps, "size" | "variant">;

export function PrimaryPageAction(props: PageActionProps) {
  return <Button size="lg" {...props} />;
}

export function SecondaryPageAction(props: PageActionProps) {
  return <Button size="lg" variant="softOutline" {...props} />;
}

export function QuietPageAction(props: PageActionProps) {
  return <Button variant="quiet" {...props} />;
}

export function CompactPrimaryPageAction(props: CompactPageActionProps) {
  return <Button size="sm" {...props} />;
}

export function CompactSecondaryPageAction(props: CompactPageActionProps) {
  return <Button size="sm" variant="softOutline" {...props} />;
}

export function CompactQuietPageAction(props: CompactPageActionProps) {
  return <Button size="sm" variant="quiet" {...props} />;
}
