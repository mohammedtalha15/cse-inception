import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfilePage() {
  return (
    <>
      <Navbar />
      <ProfileForm />
      <Footer />
    </>
  );
}
