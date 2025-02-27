import './auto-complete-panel.js';

import { assertExists, DisposableGroup } from '@blocksuite/global/utils';
import { WithDisposable } from '@blocksuite/lit';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import {
  AutoCompleteArrowIcon,
  NoteAutoCompleteIcon,
} from '../../../../_common/icons/index.js';
import { handleNativeRangeAtPoint } from '../../../../_common/utils/index.js';
import type { NoteBlockModel } from '../../../../note-block/index.js';
import type { ConnectorElementModel } from '../../../../surface-block/element-model/connector.js';
import {
  type Connection,
  ConnectorMode,
} from '../../../../surface-block/element-model/connector.js';
import type { ShapeType } from '../../../../surface-block/element-model/shape.js';
import { shapeMethods } from '../../../../surface-block/element-model/shape.js';
import { ShapeElementModel } from '../../../../surface-block/index.js';
import {
  type Bound,
  CanvasElementType,
  type IVec,
  Overlay,
  rotatePoints,
  type RoughCanvas,
  Vec,
} from '../../../../surface-block/index.js';
import { ConnectorPathGenerator } from '../../../../surface-block/managers/connector-manager.js';
import type { EdgelessPageBlockComponent } from '../../edgeless-page-block.js';
import { NOTE_INIT_HEIGHT } from '../../utils/consts.js';
import { mountShapeTextEditor } from '../../utils/text.js';
import type { SelectedRect } from '../rects/edgeless-selected-rect.js';
import { EdgelessAutoCompletePanel } from './auto-complete-panel.js';
import {
  createEdgelessElement,
  Direction,
  getPosition,
  isShape,
  MAIN_GAP,
  nextBound,
} from './utils.js';

class AutoCompleteOverlay extends Overlay {
  linePoints: IVec[] = [];
  shapePoints: IVec[] = [];
  stroke = '';
  override render(ctx: CanvasRenderingContext2D, _rc: RoughCanvas) {
    if (this.linePoints.length && this.shapePoints.length) {
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = this.stroke;
      ctx.beginPath();
      this.linePoints.forEach((p, index) => {
        if (index === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      });
      this.shapePoints.forEach((p, index) => {
        if (index === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      });
      ctx.closePath();
      ctx.stroke();
    }
  }
}

@customElement('edgeless-auto-complete')
export class EdgelessAutoComplete extends WithDisposable(LitElement) {
  static override styles = css`
    .edgeless-auto-complete-container {
      position: absolute;
      z-index: 1;
      pointer-events: none;
    }
    .edgeless-auto-complete-arrow-wrapper {
      width: 72px;
      height: 44px;
      position: absolute;
      z-index: 1;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .edgeless-auto-complete-arrow-wrapper.hidden {
      display: none;
    }
    .edgeless-auto-complete-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 19px;
      cursor: pointer;
      pointer-events: auto;
      transition:
        background 0.3s linear,
        box-shadow 0.2s linear;
    }
    .edgeless-auto-complete-arrow-wrapper:hover
      > .edgeless-auto-complete-arrow {
      border: 1px solid var(--affine-border-color);
      box-shadow: var(--affine-shadow-1);
      background: var(--affine-white);
    }

    .edgeless-auto-complete-arrow-wrapper
      > .edgeless-auto-complete-arrow:hover {
      border: 1px solid var(--affine-white-10);
      box-shadow: var(--affine-shadow-1);
      background: var(--affine-primary-color);
    }

    .edgeless-auto-complete-arrow svg {
      fill: #77757d;
    }
    .edgeless-auto-complete-arrow:hover svg {
      fill: #ffffff;
    }
  `;

  @state()
  private _isHover = true;

  @property({ attribute: false })
  edgeless!: EdgelessPageBlockComponent;

  @property({ attribute: false })
  selectedRect!: SelectedRect;

  @property({ attribute: false })
  current!: ShapeElementModel | NoteBlockModel;

  @state()
  private _isMoving = false;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _autoCompleteOverlay: AutoCompleteOverlay = new AutoCompleteOverlay();
  private _pathGenerator!: ConnectorPathGenerator;

  private get _surface() {
    return this.edgeless.surface;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._pathGenerator = new ConnectorPathGenerator({
      getElementById: id => this.edgeless.service.getElementById(id),
    });
  }

  override firstUpdated() {
    const { _disposables, edgeless } = this;

    _disposables.add(
      this.edgeless.service.selection.slots.updated.on(() => {
        this._autoCompleteOverlay.linePoints = [];
        this._autoCompleteOverlay.shapePoints = [];
      })
    );
    _disposables.add(() => this.removeOverlay());

    _disposables.add(
      edgeless.host.event.add('pointerMove', () => {
        const state = edgeless.tools.getHoverState();

        if (!state) {
          this._isHover = false;
          return;
        }

        this._isHover = state.content === this.current ? true : false;
      })
    );
  }

  private _createAutoCompletePanel(
    e: PointerEvent,
    connector: ConnectorElementModel
  ) {
    if (!isShape(this.current)) return;

    const position = this.edgeless.service.viewport.toModelCoord(
      e.clientX,
      e.clientY
    );
    const autoCompletePanel = new EdgelessAutoCompletePanel(
      position,
      this.edgeless,
      this.current,
      connector
    );

    const pageBlockContainer = this.edgeless.pageBlockContainer;
    pageBlockContainer.appendChild(autoCompletePanel);
  }

  private _onPointerDown = (e: PointerEvent, type: Direction) => {
    const { service } = this.edgeless;
    const viewportRect = service.viewport.boundingClientRect;
    const start = service.viewport.toModelCoord(
      e.clientX - viewportRect.left,
      e.clientY - viewportRect.top
    );

    if (!this.edgeless.dispatcher) return;

    let connector: ConnectorElementModel | null;

    this._disposables.addFromEvent(document, 'pointermove', e => {
      const point = service.viewport.toModelCoord(
        e.clientX - viewportRect.left,
        e.clientY - viewportRect.top
      );
      if (Vec.dist(start, point) > 8 && !this._isMoving) {
        this._isMoving = true;
        if (!isShape(this.current)) return;
        const { startPosition } = getPosition(type);
        connector = this._addConnector(
          {
            id: this.current.id,
            position: startPosition,
          },
          {
            position: point,
          }
        );
      }
      if (this._isMoving) {
        assertExists(connector);
        const otherSideId = connector.source.id;

        connector.target = this._surface.overlays.connector.renderConnector(
          point,
          otherSideId ? [otherSideId] : []
        );
      }
    });

    this._disposables.addFromEvent(document, 'pointerup', e => {
      if (!this._isMoving) {
        this._generateElementOnClick(type);
      } else if (connector && !connector.target.id) {
        this.edgeless.service.selection.clear();
        this._createAutoCompletePanel(e, connector);
      }

      this._isMoving = false;
      this._surface.overlays.connector.clear();
      this._disposables.dispose();
      this._disposables = new DisposableGroup();
    });
  };

  private _addConnector(source: Connection, target: Connection) {
    const { service } = this.edgeless;
    const id = service.addElement(CanvasElementType.CONNECTOR, {
      mode: ConnectorMode.Orthogonal,
      strokeWidth: 2,
      stroke: (<ShapeElementModel>this.current).strokeColor,
      source,
      target,
    });
    return service.getElementById(id) as ConnectorElementModel;
  }

  private _generateElementOnClick(type: Direction) {
    const { page, service } = this.edgeless;
    const bound = this._computeNextBound(type);
    const id = createEdgelessElement(this.edgeless, this.current, bound);
    if (isShape(this.current)) {
      const { startPosition, endPosition } = getPosition(type);
      this._addConnector(
        {
          id: this.current.id,
          position: startPosition,
        },
        {
          id,
          position: endPosition,
        }
      );

      mountShapeTextEditor(
        service.getElementById(id) as ShapeElementModel,
        this.edgeless
      );
    } else {
      const model = page.getBlockById(id);
      assertExists(model);
      const [x, y] = service.viewport.toViewCoord(
        bound.center[0],
        bound.y + NOTE_INIT_HEIGHT / 2
      );
      requestAnimationFrame(() => {
        handleNativeRangeAtPoint(x, y);
      });
    }

    this.edgeless.service.selection.set({
      elements: [id],
      editing: true,
    });
    this.removeOverlay();
  }

  private _showNextShape(
    current: ShapeElementModel,
    bound: Bound,
    path: IVec[],
    targetType: ShapeType
  ) {
    const { surface } = this.edgeless;
    surface.renderer.addOverlay(this._autoCompleteOverlay);

    this._autoCompleteOverlay.stroke =
      this._surface.themeObserver.getVariableValue(current.strokeColor);
    this._autoCompleteOverlay.linePoints = path;
    this._autoCompleteOverlay.shapePoints = rotatePoints(
      shapeMethods[targetType].points(bound),
      bound.center,
      current.rotate
    );
    surface.refresh();
  }

  private _computeNextBound(type: Direction) {
    if (isShape(this.current)) {
      const connectedShapes = this.edgeless.service
        .getConnectedElements(this.current)
        .filter(e => e instanceof ShapeElementModel) as ShapeElementModel[];
      return nextBound(type, this.current, connectedShapes);
    } else {
      const bound = this.current.elementBound;
      switch (type) {
        case Direction.Right: {
          bound.x += bound.w + MAIN_GAP;
          break;
        }
        case Direction.Bottom: {
          bound.y += bound.h + MAIN_GAP;
          break;
        }
        case Direction.Left: {
          bound.x -= bound.w + MAIN_GAP;
          break;
        }
        case Direction.Top: {
          bound.y -= bound.h + MAIN_GAP;
          break;
        }
      }
      return bound;
    }
  }

  private _computeLine(
    type: Direction,
    curShape: ShapeElementModel,
    nextBound: Bound
  ) {
    const startBound = this.current.elementBound;
    const { startPosition, endPosition } = getPosition(type);
    const nextShape = {
      xywh: nextBound.serialize(),
      rotate: curShape.rotate,
      shapeType: curShape.shapeType,
    };
    const startPoint = curShape.getRelativePointLocation(startPosition);
    const endPoint = curShape.getRelativePointLocation.call(
      nextShape,
      endPosition
    );

    return this._pathGenerator.generateOrthogonalConnectorPath({
      startBound,
      endBound: nextBound,
      startPoint,
      endPoint,
    });
  }

  removeOverlay() {
    this._timer && clearTimeout(this._timer);
    this.edgeless.surface.renderer.removeOverlay(this._autoCompleteOverlay);
  }

  override render() {
    const isShape = this.current instanceof ShapeElementModel;
    if (this._isMoving || (this._isHover && !isShape)) {
      this.removeOverlay();
      return nothing;
    }
    const { selectedRect } = this;
    const { zoom } = this.edgeless.service.viewport;
    const width = 72;
    const height = 44;
    // Auto-complete arrows for shape and note are different
    // Shape: right, bottom, left, top
    // Note: right, left
    const arrowDirections = isShape
      ? [Direction.Right, Direction.Bottom, Direction.Left, Direction.Top]
      : [Direction.Right, Direction.Left];
    const arrowMargin = isShape ? height / 2 : height * (2 / 3);
    const Arrows = arrowDirections.map(type => {
      let transform = '';

      switch (type) {
        case Direction.Top:
          transform += `translate(${
            selectedRect.width / 2
          }px, ${-arrowMargin}px)`;
          break;
        case Direction.Right:
          transform += `translate(${selectedRect.width + arrowMargin}px, ${
            selectedRect.height / 2
          }px)`;

          isShape && (transform += `rotate(90deg)`);
          break;
        case Direction.Bottom:
          transform += `translate(${selectedRect.width / 2}px, ${
            selectedRect.height + arrowMargin
          }px)`;
          isShape && (transform += `rotate(180deg)`);
          break;
        case Direction.Left:
          transform += `translate(${-arrowMargin}px, ${
            selectedRect.height / 2
          }px)`;
          isShape && (transform += `rotate(-90deg)`);
          break;
      }
      transform += `translate(${-width / 2}px, ${-height / 2}px)`;
      const arrowWrapperClasses = classMap({
        'edgeless-auto-complete-arrow-wrapper': true,
        hidden: !isShape && type === Direction.Left && zoom >= 1.5,
      });
      return html`<div
        class=${arrowWrapperClasses}
        style=${styleMap({
          transform,
          transformOrigin: 'left top',
        })}
      >
        <div
          class="edgeless-auto-complete-arrow"
          @mouseenter=${() => {
            this._timer = setTimeout(() => {
              if (this.current instanceof ShapeElementModel) {
                const bound = this._computeNextBound(type);
                const path = this._computeLine(type, this.current, bound);
                this._showNextShape(
                  this.current,
                  bound,
                  path,
                  this.current.shapeType
                );
              }
            }, 300);
          }}
          @mouseleave=${() => {
            this.removeOverlay();
          }}
          @pointerdown=${(e: PointerEvent) => {
            this._onPointerDown(e, type);
          }}
        >
          ${isShape ? AutoCompleteArrowIcon : NoteAutoCompleteIcon}
        </div>
      </div>`;
    });
    return html`<div
      class="edgeless-auto-complete-container"
      style=${styleMap({
        top: selectedRect.top + 'px',
        left: selectedRect.left + 'px',
        width: selectedRect.width + 'px',
        height: selectedRect.height + 'px',
        transform: `rotate(${selectedRect.rotate}deg)`,
      })}
    >
      ${Arrows}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'edgeless-auto-complete': EdgelessAutoComplete;
  }
}
