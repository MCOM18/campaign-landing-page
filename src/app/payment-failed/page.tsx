import PaymentFailed from "../payment/PaymentFailed";

export const metadata = {
  title: "Upgrade Failed | JOJO",
  description: "Unfortunately, your payment could not be processed.",
};

export default function Page() {
  return <PaymentFailed />;
}
