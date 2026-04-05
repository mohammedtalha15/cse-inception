import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <DashboardView />
      <Footer />
    </>
  );
}
