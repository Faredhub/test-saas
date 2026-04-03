import { getReservations } from "@/lib/actions/sales";
import { ReservationsClient } from "./reservations-client";

export const metadata = { title: "Table Reservations" };

export default async function ReservationsPage() {
  const reservations = await getReservations();

  return <ReservationsClient initialData={reservations} />;
}
