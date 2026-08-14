import { getTrips, getEmployees, getVehicles } from "@/lib/actions/hrm";
import { getProjects } from "@/lib/actions/projects";
import { TripsClient } from "./trips-client";

export const metadata = { title: "Trip Requests | Human Resource" };

export default async function TripsPage() {
  const [tripsData, employeesData, vehiclesData, projectsData] = await Promise.all([
    getTrips({ pageSize: 100 }),
    getEmployees({ pageSize: 100 }),
    getVehicles(),
    getProjects(),
  ]);

  return (
    <TripsClient
      initialTrips={tripsData.data || []}
      employees={employeesData.data || []}
      vehicles={vehiclesData.data || []}
      projects={projectsData.projects || []}
    />
  );
}
