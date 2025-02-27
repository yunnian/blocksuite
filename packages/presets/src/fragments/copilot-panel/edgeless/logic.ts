import type { ConnectorElementModel } from '@blocksuite/blocks';
import {
  BlocksUtils,
  EmbedHtmlBlockSpec,
  EmbedHtmlModel,
  FrameBlockModel,
  type ImageBlockProps,
} from '@blocksuite/blocks';
import type { Workspace } from '@blocksuite/store';

import type { AffineEditorContainer } from '../../../editors/index.js';
import { copilotConfig } from '../copilot-service/copilot-config.js';
import {
  FastImage2ImageServiceKind,
  Text2ImageServiceKind,
} from '../copilot-service/service-base.js';
import { demoScript } from '../demo-script.js';
import {
  frameToCanvas,
  getEdgelessPageBlockFromEditor,
  getFirstImageInFrame,
  getSurfaceElementFromEditor,
  selectedToCanvas,
  selectedToPng,
} from '../utils/selection-utils.js';
import { editImage, jpegBase64ToFile } from './edit-image.js';
import { genHtml } from './gen-html.js';

export class AIEdgelessLogic {
  public fromFrame: string = '';
  private targets: Record<
    string,
    {
      lastHash: string;
      request: (prompt: string, img: string) => Promise<string>;
    }
  > = {};

  public get autoGen() {
    return this.unsub !== undefined;
  }
  private unsub?: () => void;
  public toggleAutoGen = () => {
    if (this.unsub) {
      this.unsub();
      this.unsub = undefined;
      return;
    }
    const edgeless = getEdgelessPageBlockFromEditor(this.editor.host);
    this.unsub = edgeless.surfaceBlockModel.elementUpdated.on(() => {
      this.createImageFromFrame().catch(console.error);
    }).dispose;
  };

  get workspace(): Workspace {
    return this.editor.page.workspace;
  }

  get host() {
    return this.editor.host;
  }

  constructor(private editor: AffineEditorContainer) {}

  makeItReal = async () => {
    const png = await selectedToPng(this.editor.host);
    if (!png) {
      alert('Please select some shapes first');
      return;
    }
    const edgelessPage = getEdgelessPageBlockFromEditor(this.editor.host);
    const { notes } = BlocksUtils.splitElements(
      edgelessPage.service.selection.elements
    );
    // @ts-ignore
    const htmlBlock: {
      html: string;
      design: string;
    } = notes.flatMap(v =>
      v.children.filter(v => {
        if (v instanceof EmbedHtmlModel) {
          return v.html && v.design;
        } else {
          return false;
        }
      })
    )[0];
    const html = await genHtml(png, htmlBlock);
    if (!html) {
      return;
    }
    edgelessPage.page.addBlock(
      EmbedHtmlBlockSpec.schema.model.flavour,
      { html, design: png, xywh: '[0, 400, 400, 200]' },
      edgelessPage.surface.model.id
    );
  };

  htmlBlockDemo = async () => {
    const edgelessPage = getEdgelessPageBlockFromEditor(this.editor.host);
    edgelessPage.page.addBlock(
      EmbedHtmlBlockSpec.schema.model.flavour,
      { html: demoScript, xywh: '[0, 400, 400, 200]' },
      edgelessPage.surface.model.id
    );
  };

  editImage = async () => {
    const canvas = await selectedToCanvas(this.editor.host);
    if (!canvas) {
      alert('Please select some shapes first');
      return;
    }
    canvas.toBlob(blob => {
      if (blob) {
        const prompt =
          (
            document.getElementById(
              'copilot-panel-edit-image-prompt'
            ) as HTMLInputElement
          )?.value ?? '';
        editImage(prompt, canvas)
          ?.then(b64 => {
            if (!b64) {
              return;
            }
            const imgFile = jpegBase64ToFile(b64, 'img');
            const edgelessPage = getEdgelessPageBlockFromEditor(
              this.editor.host
            );
            edgelessPage.addImages([imgFile]).catch(console.error);
          })
          .catch(console.error);
      }
    });
  };

  createImage = async () => {
    const edgelessPage = getEdgelessPageBlockFromEditor(this.editor.host);
    const prompt =
      (
        document.getElementById(
          'copilot-panel-create-image-prompt'
        ) as HTMLInputElement
      )?.value ?? '';
    if (!prompt) {
      alert('Please enter some prompt first');
      return;
    }
    const file = await copilotConfig
      .getService('text to image', Text2ImageServiceKind)
      .generateImage(prompt);
    if (file) {
      await edgelessPage.addImages([file]);
    }
  };
  createImageFromFrame = async () => {
    const from = this.editor.page.getBlockById(
      this.fromFrame ?? ''
    ) as FrameBlockModel;
    if (!from) {
      return;
    }
    const surface = getSurfaceElementFromEditor(this.editor.host);
    const targets = (
      surface.model.elementModels.filter(
        el => el.type === 'connector'
      ) as ConnectorElementModel[]
    )
      .filter(v => v.source.id === from.id)
      .flatMap(v => {
        const block = this.editor.page.getBlockById(v.target.id ?? '');
        if (block instanceof FrameBlockModel) {
          return [block];
        }
        return [];
      });
    const canvas = await frameToCanvas(from, this.editor.host);
    if (!canvas) {
      return;
    }
    const callback = (blob: Blob | null) => {
      const run = async () => {
        if (blob) {
          const dataURL = canvas.toDataURL();
          const genImage = async (model: FrameBlockModel) => {
            const prompt = model.title.toString();
            if (!prompt) {
              return;
            }
            const hash = prompt + dataURL;
            let target = this.targets[model.id];
            if (!target) {
              this.targets[model.id] = target = {
                lastHash: '',
                request: copilotConfig
                  .getService(
                    'real time image to image',
                    FastImage2ImageServiceKind
                  )
                  .createFastRequest(),
              };
            }
            if (target.lastHash === hash) {
              return;
            }
            target.lastHash = hash;
            // const b64 = dataURL;
            const b64 = await target.request(prompt, dataURL);
            if (!b64) {
              return;
            }
            const surface = getSurfaceElementFromEditor(this.editor.host);
            let image = getFirstImageInFrame(model, this.editor.host);
            const imgFile = jpegBase64ToFile(b64, 'img');
            const sourceId = await this.editor.page.workspace.blob.set(imgFile);
            if (!image) {
              image = surface.edgeless.service.addBlock(
                'affine:image',
                {
                  size: imgFile.size,
                  xywh: model.xywh,
                },
                surface.model
              );
            }
            surface.edgeless.service.updateElement(image, {
              sourceId,
            } satisfies Partial<ImageBlockProps>);
          };
          targets.forEach(v => {
            genImage(v).catch(console.error);
          });
        }
      };
      run().catch(console.error);
    };
    canvas.toBlob(callback);
  };
}
