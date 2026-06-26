import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function ClubSettingsPage() {
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B] mb-6">Account Settings</h1>
      <div className="bg-white rounded-xl border border-black/5 p-6">
        <h2 className="text-sm font-semibold text-[#0D0D0B] mb-4">Change Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
