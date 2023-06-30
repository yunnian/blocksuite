import '../../../components/tags/multi-tag-select.js';
import '../../../components/tags/multi-tag-view.js';

import {
  AddCursorIcon,
  ArrowDownSmallIcon,
  DualLinkIcon16,
  LinkedPageIcon,
  PageIcon,
  TagsIcon,
} from '@blocksuite/global/config';
import { WithDisposable } from '@blocksuite/lit';
import type { Disposable, Page } from '@blocksuite/store';
import { DisposableGroup } from '@blocksuite/store';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import type { BlockHost } from '../../../__internal__/index.js';
import type { SelectTag } from '../../../components/tags/multi-tag-select.js';
import { popTagSelect } from '../../../components/tags/multi-tag-select.js';
import { listenBacklinkList } from './backlink/backlink.js';
import type { BackLink } from './backlink/backlink-popover.js';

@customElement('affine-page-meta-data')
export class PageMetaData extends WithDisposable(LitElement) {
  static override styles = css`
    .meta-data {
      border-radius: 8px;
      display: flex;
      align-items: center;
      height: 30px;
      cursor: pointer;
      justify-content: space-between;
      margin: 0 -12px;
    }

    .meta-data-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--affine-text-secondary-color);
    }

    .meta-data:hover {
      background-color: var(--affine-hover-color);
    }

    .tags-inline {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
    }

    .tags-inline .tag-list {
      display: flex;
      align-items: center;
    }

    .tag-inline {
      max-width: 100px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .expand {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
    }

    .meta-data-expanded {
      padding: 10px 24px;
      margin: 0 -24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background-color: var(--affine-hover-color-filled);
      border-radius: 8px;
    }

    .meta-data-expanded-title {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      font-size: 14px;
      color: var(--affine-text-secondary-color);
      align-items: center;
    }

    .meta-data-expanded-title .close {
      transform: rotate(180deg);
      border-radius: 4px;
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .meta-data-expanded-title .close:hover {
      background-color: var(--affine-hover-color);
    }

    .meta-data-expanded-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .meta-data-expanded-item {
      display: flex;
      gap: 8px;
    }

    .meta-data-expanded-item .type {
      height: 23px;
      display: flex;
      align-items: center;
    }
    .meta-data-expanded-item .type svg {
      fill: var(--affine-icon-color);
    }

    .meta-data-expanded-item .value {
      flex: 1;
    }

    .add-tag {
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .add-tag svg {
      fill: var(--affine-text-secondary-color);
    }

    .add-tag:hover {
      background-color: var(--affine-hover-color);
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag {
      padding: 4px 10px;
      border-radius: 8px;
      color: var(--affine-text-primary-color);
      font-size: 12px;
      line-height: 12px;
      display: flex;
      align-items: center;
      font-weight: 400;
      cursor: pointer;
    }
    .backlinks {
      display: flex;
      gap: 8px;
      flex-direction: column;
    }
    .backlinks .title {
      height: 28px;
      color: var(--affine-text-secondary-color);
    }
    .backlinks .link {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 15px;
      cursor: pointer;
      width: max-content;
    }
    .backlinks .link svg {
      fill: var(--affine-icon-color);
    }

    .link-title {
      border-bottom: 0.5px solid var(--affine-divider-color);
    }
  `;

  @property({ attribute: false })
  page!: Page;

  @property({ attribute: false })
  host!: BlockHost;

  get meta() {
    return this.page.workspace.meta;
  }

  get options() {
    return this.meta.properties.tags.options;
  }

  set options(tags: SelectTag[]) {
    this.tags = this.tags.filter(v => tags.find(x => x.id === v));
    this.page.workspace.meta.setProperties({
      ...this.meta.properties,
      tags: {
        ...this.meta.properties.tags,
        options: tags,
      },
    });
  }

  get tags() {
    return this.page.meta.tags ?? [];
  }

  set tags(tags: string[]) {
    this.page.meta.tags = tags;
  }

  @state()
  metaInfo!: MetaInfo;

  override connectedCallback() {
    super.connectedCallback();
    this._disposables.add(
      listenMetaInfo(this.page, metaInfo1 => {
        this.metaInfo = metaInfo1;
      })
    );
    this._disposables.add(
      this.meta.pageMetasUpdated.on(() => {
        this.requestUpdate();
      })
    );
  }

  @state()
  showSelect = false;
  _selectTags = (evt: MouseEvent) => {
    popTagSelect(this.shadowRoot?.querySelector('.tags') ?? this, {
      value: this.tags,
      onChange: tags => (this.tags = tags),
      options: this.options,
      onOptionsChange: options => (this.options = options),
    });
  };

  private renderBacklinkInline = () => {
    const click = (e: MouseEvent) => {
      e.stopPropagation();
    };
    return html`
      <backlink-button
        @click=${click}
        .host="${this}"
        .page="${this.page}"
      ></backlink-button>
    `;
  };
  private renderTagsInline = () => {
    const tags = this.tags;
    const optionMap = Object.fromEntries(this.options.map(v => [v.id, v]));
    return html` <div class="tags-inline">
      ${TagsIcon}
      ${tags.length > 0
        ? html` <div class="tag-list">
            ${repeat(
              tags.slice(0, 3),
              id => id,
              (id, i) => {
                const tag = optionMap[id];
                if (!tag) {
                  return null;
                }
                return html` <div style="white-space: pre">
                    ${i !== 0 ? ', ' : ''}
                  </div>
                  <div class="tag-inline">${tag.value}</div>`;
              }
            )}
            ${tags.length > 3 ? html`, and ${tags.length - 3} more` : ''}
          </div>`
        : 'Tags'}
    </div>`;
  };

  @state()
  expanded = false;
  private _toggle = () => {
    this.expanded = !this.expanded;
  };
  private renderBacklinkExpanded = () => {
    const backlinkList = this.metaInfo.backlinkList;
    if (!backlinkList.length) {
      return null;
    }
    const metaMap = Object.fromEntries(
      this.page.workspace.meta.pageMetas.map(v => [v.id, v])
    );
    const renderLink = (link: BackLink) => {
      const click = () => {
        if (link.pageId === this.page.id) {
          // On the current page, no need to jump
          // TODO jump to block
          return;
        }
        this.host.slots.pageLinkClicked.emit({
          pageId: link.pageId,
          blockId: link.blockId,
        });
      };
      const meta = metaMap[link.pageId];
      return html`<div @click=${click} class="link">
        ${link.type === 'LinkedPage' ? LinkedPageIcon : PageIcon}
        <div class="link-title">${meta.title}</div>
      </div>`;
    };
    return html` <div class="meta-data-expanded-item">
      <div class="type">${DualLinkIcon16}</div>
      <div class="value">
        <div class="backlinks">
          <div class="title">Linked to this page</div>
          ${repeat(backlinkList, v => v.pageId, renderLink)}
        </div>
      </div>
    </div>`;
  };
  private renderTagsExpanded = () => {
    const optionMap = Object.fromEntries(this.options.map(v => [v.id, v]));
    return html` <div class="meta-data-expanded-item">
      <div class="type">${TagsIcon}</div>
      <div class="value">
        <div class="tags">
          ${repeat(
            this.tags,
            id => id,
            id => {
              const tag = optionMap[id];
              if (!tag) {
                return null;
              }
              const style = styleMap({
                backgroundColor: tag.color,
              });
              return html` <div class="tag" style=${style}>${tag.value}</div>`;
            }
          )}
          <div class="add-tag" @click="${this._selectTags}">
            ${AddCursorIcon}
          </div>
        </div>
      </div>
    </div>`;
  };

  override render() {
    if (!this.expanded) {
      return html`
        <div class="meta-data" @click="${this._toggle}">
          <div class="meta-data-content">
            ${this.renderBacklinkInline()} ${this.renderTagsInline()}
          </div>
          <div class="expand">${ArrowDownSmallIcon}</div>
        </div>
      `;
    }
    this._disposables;
    return html` <div class="meta-data-expanded">
      <div class="meta-data-expanded-title">
        <div>Page info</div>
        <div @click="${this._toggle}" class="close">${ArrowDownSmallIcon}</div>
      </div>
      <div class="meta-data-expanded-content">
        ${this.renderBacklinkExpanded()} ${this.renderTagsExpanded()}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-page-meta-data': PageMetaData;
  }
}
type MetaInfo = {
  backlinkList: BackLink[];
};
const listenMetaInfo = (
  page: Page,
  update: (metaInfo: MetaInfo) => void
): Disposable => {
  const disposableGroup = new DisposableGroup();
  const data: MetaInfo = {
    backlinkList: [],
  };
  update(data);
  const updateData = (cb: (data: MetaInfo) => void) => {
    cb(data);
    update(data);
  };
  disposableGroup.add(
    listenBacklinkList(page, list => {
      updateData(data => {
        data.backlinkList = list;
      });
    })
  );
  return {
    dispose: () => disposableGroup.dispose(),
  };
};
