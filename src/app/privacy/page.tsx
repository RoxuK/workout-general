import Header from "@/components/Header";

export const metadata = {
  title: "Privacy Policy — FitPlan",
};

export default function PrivacyPage() {
  return (
    <div className="animate-fade-up pb-10">
      <Header eyebrow="Legal" title="Privacy Policy" back="/ajustes" />

      <p className="text-xs text-muted mb-6">Last updated: June 30, 2026</p>

      <div className="space-y-6 text-sm text-muted">
        <section>
          <h2 className="section-title mb-2 text-lg">Summary</h2>
          <p>
            FitPlan does not have a server, a user account system, or any analytics or
            advertising SDKs. Every piece of data you enter — your name, your plan, your
            workout and nutrition logs, your photos — is stored only on your own device.
            We (the developer) never see it, collect it, or transmit it anywhere.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">What data the app stores, and where</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Your name, training plan, nutrition targets, recipes and
              shopping list</strong> — stored in your browser&apos;s local storage on your device.
            </li>
            <li>
              <strong className="text-ink">Workout logs, weigh-ins, nutrition check-ins, free meals,
              menstrual cycle logs and reminder settings</strong> — also stored in local storage on
              your device.
            </li>
            <li>
              <strong className="text-ink">Progress photos</strong> — stored in your browser&apos;s
              on-device database (IndexedDB). Photos are never included in the JSON backup file and
              are never uploaded anywhere by the app.
            </li>
          </ul>
          <p className="mt-2">
            None of this data leaves your device unless you explicitly choose to export it (see
            below). Uninstalling the app, or clearing your browser&apos;s site data for FitPlan,
            permanently deletes all of it.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">Data you choose to export or share</h2>
          <p>
            The app lets you generate a JSON backup file or an Excel (.xlsx) report of your own
            data, and an AI prompt for personalising your plan. These are actions you take
            yourself:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Backup / Excel export</strong> — saved as a file on your
              device. The app does not send it anywhere; what you do with that file afterwards
              (e.g. sharing it) is up to you.
            </li>
            <li>
              <strong className="text-ink">AI plan generation</strong> — the app gives you a text
              prompt to copy and paste into an AI chat assistant of your choice (such as Claude,
              ChatGPT, or Gemini), in a separate app or browser tab. Anything you type into that
              assistant is subject to that provider&apos;s own privacy policy, not FitPlan&apos;s —
              we have no part in that exchange and never receive a copy of it.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">Third-party content</h2>
          <p>
            Exercise reference images are loaded directly from a public, open-source image CDN
            (jsDelivr, serving the public-domain free-exercise-db dataset) so you can see how an
            exercise is performed. Loading an image may expose your IP address to that CDN the
            same way any website image would — no personal data from the app is sent alongside
            it.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">What we don&apos;t do</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>No accounts, no sign-up, no passwords.</li>
            <li>No analytics, crash reporting, or usage tracking of any kind.</li>
            <li>No advertising or ad identifiers.</li>
            <li>No selling, renting, or sharing your data — we don&apos;t have it to begin with.</li>
          </ul>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">Your choices</h2>
          <p>
            From Settings you can export all your data, import a backup, or permanently delete
            everything stored by the app on your device at any time — no need to contact anyone,
            since we don&apos;t hold a copy to delete on our end.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">Children&apos;s privacy</h2>
          <p>
            FitPlan is not directed at children and is not knowingly used to collect data from
            children, since it does not collect data from anyone — all information stays on the
            device of whoever installs the app.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">Changes to this policy</h2>
          <p>
            If this policy changes, the &quot;Last updated&quot; date above will change too. Since
            the app has no way to contact you directly, please check back here if you have
            concerns.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-2 text-lg">Contact</h2>
          <p>
            Questions about this policy can be sent to{" "}
            <a href="mailto:roxukinbaku@gmail.com" className="text-accent underline">
              roxukinbaku@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
