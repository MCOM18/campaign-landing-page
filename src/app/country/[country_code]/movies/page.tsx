import { redirect } from "next/navigation";

export async function generateStaticParams() {
  return [{ country_code: "default" }];
}

export default function MoviePage() {
  redirect("/");
}
