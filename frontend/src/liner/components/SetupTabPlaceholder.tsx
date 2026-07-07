import type { ReactNode } from "react";

import { ja } from "../../i18n/ja";

import type { LinerSetupTabId } from "../uiPreparation";

export type SetupTabPlaceholderVariant = "height" | "review";

export interface SetupTabPlaceholderProps {

tabId: LinerSetupTabId;

variant: SetupTabPlaceholderVariant;

}

interface PlaceholderContent {

title: string;

description: string;

bullets: readonly string[];

}

function resolveContent(variant: SetupTabPlaceholderVariant): PlaceholderContent {

const content = ja.liner.setupTabPlaceholder[variant];

return {

title: content.title,

description: content.description,

bullets: content.bullets,

};

}

export function SetupTabPlaceholder({ tabId, variant }: SetupTabPlaceholderProps): ReactNode {

const content = resolveContent(variant);

return (

<section

className="liner-edit-panel liner-setup-tab-placeholder"

aria-label={content.title}

data-testid={`liner-setup-tab-placeholder-${tabId}`}

>

<h2 className="liner-setup-tab-placeholder-title">{content.title}</h2>

<p className="liner-setup-tab-placeholder-description">{content.description}</p>

{content.bullets.length > 0 && (

<ul className="liner-setup-tab-placeholder-list">

{content.bullets.map((bullet, index) => (

<li key={`${tabId}-bullet-${index}`}>{bullet}</li>

))}

</ul>

)}

</section>

);

}
