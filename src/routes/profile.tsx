import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, apiPost, apiPut } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | Pistara" },
      { name: "description", content: "Manage your Pistara profile and delivery address." },
      { property: "og:title", content: "My Profile | Pistara" },
      { property: "og:description", content: "Manage your Pistara profile." },
    ],
  }),
  component: ProfilePage,
});

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-1 h-11 w-full rounded-xl border bg-cream px-4 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function ProfilePage() {
  const { user, address, loading, refresh } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  /**
   * Guards react to the session disappearing. That is correct for a fresh
   * visit without a session, but during an explicit logout the redirect
   * would be the navigation that fires LAST — overriding the header's own
   * "go home" navigation and landing on /login?redirect=/profile. So the
   * redirect only applies when this mount never saw a signed-in user.
   */
  const hadUser = useRef(false);
  if (user) hadUser.current = true;

  useEffect(() => {
    if (!loading && !user && !hadUser.current)
      navigate({ to: "/login", search: { redirect: "/profile" }, replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setMobile(user.mobile ?? "");
    }
    if (address) {
      setLine1(address.line1);
      setLine2(address.line2 ?? "");
      setArea(address.area ?? "");
      setCity(address.city);
      setState(address.state);
      setPincode(address.pincode);
    }
  }, [user, address]);

  const saveProfile = useMutation({
    mutationFn: () =>
      apiPut("/api/profile", {
        name,
        mobile,
        address: { line1, line2, area, city, state, pincode },
      }),
    onSuccess: () => {
      refresh();
      toast.success("Profile saved");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save profile"),
  });

  const changePw = useMutation({
    mutationFn: () =>
      apiPost("/api/auth/change-password", { currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not change password"),
  });

  if (!user) return null;

  return (
    <div className="container-page section-y max-w-3xl">
      <h1 className="font-display text-4xl font-extrabold text-primary-deep">
        My <span className="accent-serif text-primary">Profile</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Signed in as {user.email}</p>

      <form
        className="mt-10 rounded-3xl border bg-card p-6 shadow-soft md:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          saveProfile.mutate();
        }}
      >
        <h2 className="font-display text-xl font-bold text-primary-deep">Delivery details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Phone and address are required to place an order.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            id="p-name"
            label="Full name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            id="p-mobile"
            label="Mobile"
            required
            pattern="[0-9]{10}"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="9876543210"
          />
          <div className="sm:col-span-2">
            <Field
              id="p-line1"
              label="Address line 1"
              required
              minLength={3}
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="Flat / house no., street"
            />
          </div>
          <Field
            id="p-line2"
            label="Address line 2 (optional)"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
          />
          <Field
            id="p-area"
            label="Area / landmark (optional)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
          <Field
            id="p-city"
            label="City"
            required
            minLength={2}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Field
            id="p-state"
            label="State"
            required
            minLength={2}
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
          <Field
            id="p-pincode"
            label="Pincode"
            required
            pattern="[0-9]{6}"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="302001"
          />
        </div>
        <Button className="mt-6" type="submit" disabled={saveProfile.isPending}>
          {saveProfile.isPending && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </form>

      <form
        className="mt-8 rounded-3xl border bg-card p-6 shadow-soft md:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (newPw !== confirmPw) {
            toast.error("New passwords do not match");
            return;
          }
          changePw.mutate();
        }}
      >
        <h2 className="font-display text-xl font-bold text-primary-deep">Change password</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field
            id="pw-cur"
            label="Current password"
            type="password"
            required
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <Field
            id="pw-new"
            label="New password"
            type="password"
            required
            minLength={8}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <Field
            id="pw-confirm"
            label="Confirm new password"
            type="password"
            required
            minLength={8}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
          />
        </div>
        <Button className="mt-6" variant="outline" type="submit" disabled={changePw.isPending}>
          {changePw.isPending && <Loader2 className="animate-spin" />} Update password
        </Button>
      </form>
    </div>
  );
}
