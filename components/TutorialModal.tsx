"use client";

import React from "react";

export type TutorialModalProps = {
  onClose: () => void;
};

function TutorialSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-16">
      <h2 className="text-base font-semibold text-white mb-3 pb-2 border-b border-ink-600">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-ink-200 leading-relaxed">{children}</div>
    </section>
  );
}

const NAV_LINKS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "filter-layers", label: "Filter Layers" },
  { id: "masks", label: "Masks" },
  { id: "curves", label: "Curves" },
  { id: "hsl", label: "HSL Panel" },
  { id: "export", label: "Export" },
  { id: "composite", label: "Composite Workspace" },
  { id: "premium", label: "Premium Features" },
  { id: "billing", label: "Subscription & Billing" },
];

export default function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-ink-800 rounded-xl border border-ink-600"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Non-scrolling header: nav + X button */}
        <div className="relative flex-shrink-0 border-b border-ink-600">
          <nav className="px-6 py-3 flex flex-wrap gap-x-4 gap-y-2 pr-10">
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-xs font-medium text-ink-200 hover:text-accent-400 transition whitespace-nowrap uppercase tracking-wide"
              >
                {label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-3 text-ink-200 hover:text-ink-100 transition p-1"
            aria-label="Close tutorial"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pt-6 pb-8">
          <h1 className="text-2xl font-bold text-ink-50 mb-1">picmagIQ Tutorial</h1>
          <p className="text-sm text-ink-200 mb-8">
            A complete guide to every feature in the editor.
          </p>

          <TutorialSection id="getting-started" title="Getting Started">
            <p>
              picmagIQ is a web-based image editor for applying professional-grade filters to your
              images. All processing happens in real time so you can see every change instantly.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Upload a JPEG, PNG, or WebP image using the upload area in the left panel.</li>
              <li>
                Your image appears in the live preview on the right — all changes update in real
                time.
              </li>
              <li>
                No account is required to explore the editor, but you'll need a subscription to
                export.
              </li>
              <li>
                Use the top nav to switch between the <strong>Editor</strong> and{" "}
                <strong>Composite</strong> workspaces.
              </li>
            </ul>
          </TutorialSection>

          <TutorialSection id="filter-layers" title="Filter Layers">
            <p>
              The filter system is layer-based — you can stack multiple presets on top of each
              other, with each layer having its own independent settings.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click "+ Add Layer" to add a preset to your stack.</li>
              <li>
                Each layer shows its preset name, a visibility toggle, an intensity slider, and a
                delete button.
              </li>
              <li>
                Drag the handle on the left of each layer to reorder them — layers are applied top
                to bottom.
              </li>
              <li>
                The intensity slider controls how strongly the preset blends with the image below
                it.
              </li>
              <li>
                Click a layer to expand its fine-tuning controls — each preset has unique
                parameters.
              </li>
              <li>
                Some presets are Premium-only and will be locked on the Basic plan. Look for the
                Premium badge.
              </li>
            </ul>
          </TutorialSection>

          <TutorialSection id="masks" title="Masks">
            <p>
              Every layer supports two mask types: Luminosity and Color Range. Masks let you
              restrict where a layer's effect is applied.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click the MASK button on any layer to open its mask controls.</li>
              <li>
                <strong>Luminosity masks</strong> restrict the layer's effect to a specific
                brightness range. Use Min/Max to set the range and Smoothness to feather the edges.
                Enable Invert to flip the affected range.
              </li>
              <li>
                <strong>Color Range masks</strong> restrict the effect to specific hues. Enable
                individual color channels (Reds, Oranges, Yellows, Greens, Cyans, Blues, Magentas)
                and adjust Expansion and Smoothness per channel.
              </li>
              <li>
                Both mask types can be active simultaneously — their effects are combined.
              </li>
            </ul>
          </TutorialSection>

          <TutorialSection id="curves" title="Curves">
            <p>
              Curves give you precise control over the tonal response of a layer or the entire
              image.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Each layer has a per-layer Curves panel accessible via the Curves tab on the layer.
              </li>
              <li>Adjust the RGB master curve or individual R, G, B channels.</li>
              <li>Click the curve to add control points; drag points to reshape the tone response.</li>
              <li>Double-click a point to remove it.</li>
              <li>
                A global Curves panel is also available at the bottom of the left panel, applying
                to the entire image output after all layers.
              </li>
            </ul>
          </TutorialSection>

          <TutorialSection id="hsl" title="HSL Panel">
            <p>
              The HSL panel applies a global hue, saturation, and luminance adjustment to the
              entire image, independent of any filter layers.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Adjust individual color ranges: Reds, Oranges, Yellows, Greens, Cyans, Blues,
                Magentas, and a global All channel.
              </li>
              <li>HSL adjustments are applied after all filter layers.</li>
              <li>Switch to the HSL tab in the left panel to access these controls.</li>
            </ul>
          </TutorialSection>

          <TutorialSection id="export" title="Export">
            <p>
              When you're happy with your edit, use the Export button to render and download the
              final image.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click the Export button to render and download your image.</li>
              <li>
                Choose from three output formats: <strong>WebP</strong> (recommended),{" "}
                <strong>JPEG</strong>, and <strong>PNG</strong>.
              </li>
              <li>
                Optionally enter a target width in pixels — the image will be resized
                proportionally. Leave blank to export at original size.
              </li>
              <li>
                Exports are processed server-side using a headless browser to guarantee the
                exported file is pixel-perfect to the preview.
              </li>
              <li>You must have an active subscription to export.</li>
            </ul>
          </TutorialSection>

          <TutorialSection id="composite" title="Composite Workspace">
            <p>
              The Composite Workspace is a Premium feature for compositing multiple subjects onto a
              background image. Switch to the Composite tab in the top nav to access it.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Start by uploading a background image.</li>
              <li>
                Add up to 5 subjects — each subject is automatically background-removed using AI.
              </li>
              <li>
                Per-subject controls: drag to reposition, scale slider, W (px) input for precise
                sizing, filter layer stack, and a brush-based mask editor for refining edges.
              </li>
            </ul>
            <p className="mt-3 font-medium text-ink-100">Brush Mask Editor</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Click <strong>Edit Mask</strong> on any subject to open the brush-based mask editor</li>
              <li>In mask edit mode, the canvas dims all other layers so you can focus on the active subject</li>
              <li>Use <strong>Erase</strong> mode to paint away parts of the subject (removes pixels from the composite)</li>
              <li>Use <strong>Restore</strong> mode to paint back previously erased areas</li>
              <li>Adjust <strong>Brush Size</strong> and <strong>Hardness</strong> using the toolbar at the top of the preview</li>
              <li>Hard edges (high hardness) give sharp cutouts; soft edges (low hardness) feather the transition naturally</li>
              <li>Use <strong>Undo</strong> (⌘Z) and <strong>Redo</strong> (⌘⇧Z) to step through your brush strokes — up to 30 levels</li>
              <li>Click <strong>Done</strong> in the toolbar to exit mask edit mode and return to the composite view</li>
            </ul>
            <ul className="list-disc list-inside space-y-1 mt-3">
              <li>
                The Overlay section lets you add a fourth image on top of the entire composite —
                with its own opacity slider, scale, position, and filter layers.
              </li>
              <li>
                Export the composite using the Export Composite button — supports WebP, JPEG, and
                PNG with optional width resize.
              </li>
            </ul>
          </TutorialSection>

          <TutorialSection id="premium" title="Premium Features">
            <p>
              Premium subscribers have access to additional features not available on the Basic
              plan.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>LUT Presets:</strong> six professional film emulation presets — Kodak 2383,
                Bleach Bypass, Fuji 3510, Cool Fade, Warm Print, and Split Tone Pro — rendered via
                WebGL for accurate 3D color transforms.
              </li>
              <li>
                <strong>Split Tone Pro:</strong> a genuine 3D hue-affinity transform with five
                color pairs and an overall strength control.
              </li>
              <li>
                <strong>Focal Blur:</strong> a WebGL zoom/radial blur preset with a bounding box
                focal region selector directly on the preview.
              </li>
              <li>
                <strong>Composite Workspace:</strong> full access to multi-subject compositing (see
                above).
              </li>
              <li>
                <strong>AI Tutor:</strong> a floating chat assistant powered by Claude that
                receives your full layer stack as context and can answer questions about your
                current edit.
              </li>
            </ul>
          </TutorialSection>

          <TutorialSection id="billing" title="Subscription & Billing">
            <p>picmagIQ offers two subscription plans:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Basic ($19.99/mo):</strong> all Canvas 2D filter presets and export in
                WebP, JPEG, and PNG.
              </li>
              <li>
                <strong>Premium ($29.99/mo):</strong> everything in Basic plus LUT presets, Split
                Tone Pro, Focal Blur, Composite Workspace, and AI Tutor.
              </li>
              <li>
                To upgrade from Basic to Premium, open the user menu (top right) and click Upgrade
                to Premium.
              </li>
              <li>
                To manage or cancel your subscription, open the user menu and click Manage
                Subscription — this opens the Stripe billing portal where you can change plans or
                cancel.
              </li>
              <li>
                Your subscription is managed securely through Stripe — picmagIQ never stores your
                payment information.
              </li>
            </ul>
          </TutorialSection>
        </div>
      </div>
    </div>
  );
}
