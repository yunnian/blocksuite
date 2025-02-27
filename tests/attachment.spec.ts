import { expect, type Page } from '@playwright/test';

import { moveToImage } from './utils/actions/drag.js';
import {
  pressBackspace,
  pressEnter,
  pressEscape,
  redoByKeyboard,
  SHORT_KEY,
  type,
  undoByKeyboard,
} from './utils/actions/keyboard.js';
import {
  captureHistory,
  enterPlaygroundRoom,
  focusRichText,
  initEmptyParagraphState,
  waitNextFrame,
} from './utils/actions/misc.js';
import {
  assertImageOption,
  assertKeyboardWorkInInput,
  assertRichImage,
  assertStoreMatchJSX,
} from './utils/asserts.js';
import { test } from './utils/playwright.js';

const FILE_NAME = 'test-card-1.png';
const FILE_PATH = `packages/playground/public/${FILE_NAME}`;
const FILE_ID = 'ejImogf-Tb7AuKY-v94uz1zuOJbClqK-tWBxVr_ksGA=';
const FILE_SIZE = 45801;

function getAttachment(page: Page) {
  const attachment = page.locator('affine-attachment');
  const loading = attachment.locator('.affine-attachment-loading');
  const options = page.locator('.affine-attachment-options');
  const turnToEmbedBtn = options
    .locator('icon-button')
    .filter({ hasText: 'Turn into Embed view' });
  const renameBtn = options
    .locator('icon-button')
    .filter({ hasText: 'Rename' });
  const renameInput = page.locator('.affine-attachment-rename-container input');

  const insertAttachment = async () => {
    await page.evaluate(async () => {
      // Force fallback to input[type=file] in tests
      // See https://github.com/microsoft/playwright/issues/8850
      window.showOpenFilePicker = undefined;
    });

    const slashMenu = page.locator(`.slash-menu`);
    await waitNextFrame(page);
    await type(page, '/');
    await expect(slashMenu).toBeVisible();
    await type(page, 'file', 100);
    await expect(slashMenu).toBeVisible();

    await pressEnter(page);
    await page.setInputFiles("input[type='file']", FILE_PATH);
    // Try to break the undo redo test
    await captureHistory(page);

    await expect(attachment).toBeVisible();
  };

  const getName = () =>
    attachment.locator('.affine-attachment-name').innerText();

  return {
    // locators
    attachment,
    options,
    turnToEmbedBtn,
    renameBtn,
    renameInput,

    // actions
    insertAttachment,
    /**
     * Wait for the attachment upload to finish
     */
    waitLoading: () => loading.waitFor({ state: 'hidden' }),
    getName,
    getSize: () => attachment.locator('.affine-attachment-desc').innerText(),

    turnToEmbed: async () => {
      await expect(turnToEmbedBtn).toBeVisible();
      await turnToEmbedBtn.click();
      await assertRichImage(page, 1);
    },
    rename: async (newName: string) => {
      await attachment.hover();
      await expect(options).toBeVisible();
      await renameBtn.click();
      await page.keyboard.press(`${SHORT_KEY}+a`, { delay: 50 });
      await pressBackspace(page);
      await type(page, newName);
      await pressEnter(page);
      expect(await getName()).toContain(newName);
    },

    // external
    turnImageToCard: async () => {
      await moveToImage(page);
      await assertImageOption(page);
      const btn = page
        .locator('icon-button')
        .filter({ hasText: 'Turn into Card view' });
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(attachment).toBeVisible();
    },
  };
}

test('can insert attachment from slash menu', async ({ page }) => {
  await enterPlaygroundRoom(page);
  const { noteId } = await initEmptyParagraphState(page);

  const { insertAttachment, waitLoading, getName, getSize } =
    getAttachment(page);

  await focusRichText(page);
  await insertAttachment();

  // Wait for the attachment to be uploaded
  await waitLoading();

  expect(await getName()).toBe(FILE_NAME);
  expect(await getSize()).toBe('45.8 kB');

  await assertStoreMatchJSX(
    page,
    `
<affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:attachment
    prop:embed={false}
    prop:name="${FILE_NAME}"
    prop:size={${FILE_SIZE}}
    prop:sourceId="${FILE_ID}"
    prop:type="image/png"
  />
</affine:note>`,
    noteId
  );
});

test('should undo/redo works for attachment', async ({ page }) => {
  await enterPlaygroundRoom(page);
  const { noteId } = await initEmptyParagraphState(page);

  const { insertAttachment, waitLoading } = getAttachment(page);

  await focusRichText(page);
  await insertAttachment();

  // Wait for the attachment to be uploaded
  await waitLoading();

  await assertStoreMatchJSX(
    page,
    `  <affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:attachment
    prop:embed={false}
    prop:name="${FILE_NAME}"
    prop:size={${FILE_SIZE}}
    prop:sourceId="${FILE_ID}"
    prop:type="image/png"
  />
</affine:note>`,
    noteId
  );

  await undoByKeyboard(page);
  // The loading/error state should not be restored after undo
  await assertStoreMatchJSX(
    page,
    `
<affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:paragraph
    prop:type="text"
  />
</affine:note>`,
    noteId
  );

  await redoByKeyboard(page);
  await assertStoreMatchJSX(
    page,
    `
<affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:attachment
    prop:embed={false}
    prop:name="${FILE_NAME}"
    prop:size={${FILE_SIZE}}
    prop:sourceId="${FILE_ID}"
    prop:type="image/png"
  />
</affine:note>`,
    noteId
  );
});

test('should rename attachment works', async ({ page }) => {
  test.info().annotations.push({
    type: 'issue',
    description: 'https://github.com/toeverything/blocksuite/issues/4534',
  });
  await enterPlaygroundRoom(page);
  await initEmptyParagraphState(page);
  const {
    attachment,
    renameBtn,
    renameInput,
    insertAttachment,
    waitLoading,
    getName,
    rename,
  } = getAttachment(page);

  await focusRichText(page);
  await insertAttachment();
  // Wait for the attachment to be uploaded
  await waitLoading();

  expect(await getName()).toBe(FILE_NAME);

  await attachment.hover();
  await expect(renameBtn).toBeVisible();
  await renameBtn.click();
  await assertKeyboardWorkInInput(page, renameInput);
  await pressEscape(page);
  await expect(renameInput).not.toBeVisible();

  await rename('new-name');
  expect(await getName()).toBe('new-name.png');
  await rename('');
  expect(await getName()).toBe('.png');
  await rename('abc');
  expect(await getName()).toBe('abc');
});

test('should turn attachment to image works', async ({ page }) => {
  await enterPlaygroundRoom(page);
  const { noteId } = await initEmptyParagraphState(page);
  const { insertAttachment, waitLoading, turnToEmbed, turnImageToCard } =
    getAttachment(page);

  await focusRichText(page);
  await insertAttachment();
  // Wait for the attachment to be uploaded
  await waitLoading();

  await turnToEmbed();

  await assertStoreMatchJSX(
    page,
    `
<affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:image
    prop:caption=""
    prop:height={0}
    prop:index="a0"
    prop:rotate={0}
    prop:size={${FILE_SIZE}}
    prop:sourceId="${FILE_ID}"
    prop:width={0}
  />
</affine:note>`,
    noteId
  );
  await turnImageToCard();
  await assertStoreMatchJSX(
    page,
    `
<affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:attachment
    prop:caption=""
    prop:embed={false}
    prop:name="${FILE_NAME}"
    prop:size={${FILE_SIZE}}
    prop:sourceId="${FILE_ID}"
    prop:type="image/png"
  />
</affine:note>`,
    noteId
  );
});

test('should attachment can be deleted', async ({ page }) => {
  await enterPlaygroundRoom(page);
  const { noteId } = await initEmptyParagraphState(page);
  const { attachment, insertAttachment, waitLoading } = getAttachment(page);

  await focusRichText(page);
  await insertAttachment();
  // Wait for the attachment to be uploaded
  await waitLoading();

  await attachment.click();
  await pressBackspace(page);
  await assertStoreMatchJSX(
    page,
    `
<affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:paragraph
    prop:type="text"
  />
</affine:note>`,
    noteId
  );
});

test(`support dragging attachment block directly`, async ({ page }) => {
  await enterPlaygroundRoom(page);
  const { noteId } = await initEmptyParagraphState(page);

  const { insertAttachment, waitLoading, getName, getSize } =
    getAttachment(page);

  await focusRichText(page);
  await insertAttachment();

  // Wait for the attachment to be uploaded
  await waitLoading();

  expect(await getName()).toBe(FILE_NAME);
  expect(await getSize()).toBe('45.8 kB');

  await assertStoreMatchJSX(
    page,
    `  <affine:note
  prop:background="--affine-background-secondary-color"
  prop:displayMode="both"
  prop:edgeless={
    Object {
      "style": Object {
        "borderRadius": 8,
        "borderSize": 4,
        "borderStyle": "solid",
        "shadowType": "--affine-note-shadow-box",
      },
    }
  }
  prop:hidden={false}
  prop:index="a0"
>
  <affine:attachment
    prop:embed={false}
    prop:name="${FILE_NAME}"
    prop:size={${FILE_SIZE}}
    prop:sourceId="${FILE_ID}"
    prop:type="image/png"
  />
</affine:note>`,
    noteId
  );

  const attachmentBlock = page.locator('affine-attachment');
  const rect = await attachmentBlock.boundingBox();
  if (!rect) {
    throw new Error('image not found');
  }

  // add new paragraph blocks
  await page.mouse.click(rect.x + 20, rect.y + rect.height + 20);
  await focusRichText(page);
  await type(page, '111');
  await page.waitForTimeout(200);
  await pressEnter(page);

  await type(page, '222');
  await page.waitForTimeout(200);
  await pressEnter(page);

  await type(page, '333');
  await page.waitForTimeout(200);

  await page.waitForTimeout(200);
  await assertStoreMatchJSX(
    page,
    /*xml*/ `<affine:page>
  <affine:note
    prop:background="--affine-background-secondary-color"
    prop:displayMode="both"
    prop:edgeless={
      Object {
        "style": Object {
          "borderRadius": 8,
          "borderSize": 4,
          "borderStyle": "solid",
          "shadowType": "--affine-note-shadow-box",
        },
      }
    }
    prop:hidden={false}
    prop:index="a0"
  >
    <affine:attachment
      prop:embed={false}
      prop:name="${FILE_NAME}"
      prop:size={${FILE_SIZE}}
      prop:sourceId="${FILE_ID}"
      prop:type="image/png"
    />
    <affine:paragraph
      prop:text="111"
      prop:type="text"
    />
    <affine:paragraph
      prop:text="222"
      prop:type="text"
    />
    <affine:paragraph
      prop:text="333"
      prop:type="text"
    />
  </affine:note>
</affine:page>`
  );

  // drag bookmark block
  await page.mouse.move(rect.x + 20, rect.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(200);

  await page.mouse.move(rect.x + 40, rect.y + rect.height + 80);
  await page.waitForTimeout(200);

  await page.mouse.up();
  await page.waitForTimeout(200);

  const rects = page.locator('affine-block-selection');
  await expect(rects).toHaveCount(1);

  await assertStoreMatchJSX(
    page,
    /*xml*/ `<affine:page>
  <affine:note
    prop:background="--affine-background-secondary-color"
    prop:displayMode="both"
    prop:edgeless={
      Object {
        "style": Object {
          "borderRadius": 8,
          "borderSize": 4,
          "borderStyle": "solid",
          "shadowType": "--affine-note-shadow-box",
        },
      }
    }
    prop:hidden={false}
    prop:index="a0"
  >
    <affine:paragraph
      prop:text="111"
      prop:type="text"
    />
    <affine:paragraph
      prop:text="222"
      prop:type="text"
    />
    <affine:attachment
      prop:embed={false}
      prop:name="${FILE_NAME}"
      prop:size={${FILE_SIZE}}
      prop:sourceId="${FILE_ID}"
      prop:type="image/png"
    />
    <affine:paragraph
      prop:text="333"
      prop:type="text"
    />
  </affine:note>
</affine:page>`
  );
});
