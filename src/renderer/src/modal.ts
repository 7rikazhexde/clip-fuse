import type { ResolutionOption } from './store.js'

export type OverwriteChoice = 'overwrite' | 'rename' | 'cancel'

function createOverlay(inner: string): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = inner
  document.body.appendChild(overlay)
  return overlay
}

function remove(overlay: HTMLElement): void {
  if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
}

export function showOverwriteDialog(filename: string): Promise<OverwriteChoice> {
  return new Promise((resolve) => {
    const overlay = createOverlay(`
      <div class="modal-content">
        <div class="modal-header"><h3>&#9888;&#65039; ファイルが既に存在します</h3></div>
        <div class="modal-body">
          <p><strong>${filename}</strong> は既に存在しています。</p>
          <p>どのように処理しますか？</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-danger" id="m-overwrite">上書きする</button>
          <button class="btn btn-secondary" id="m-rename">名前を変更</button>
          <button class="btn btn-outline" id="m-cancel">キャンセル</button>
        </div>
      </div>
    `)

    const done = (choice: OverwriteChoice) => { remove(overlay); resolve(choice) }
    overlay.querySelector('#m-overwrite')!.addEventListener('click', () => done('overwrite'))
    overlay.querySelector('#m-rename')!.addEventListener('click', () => done('rename'))
    overlay.querySelector('#m-cancel')!.addEventListener('click', () => done('cancel'))

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); done('cancel') } }
    document.addEventListener('keydown', onKey)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { document.removeEventListener('keydown', onKey); done('cancel') } })
  })
}

export type ResolutionChoice =
  | { action: 'cancel' }
  | { action: 'copy' }
  | { action: 'reencode'; scalingMode: 'letterbox' | 'crop'; targetWidth: number; targetHeight: number }

export function showResolutionDialog(
  fileResolutions: string[],
  resolutionOptions: ResolutionOption[]
): Promise<ResolutionChoice> {
  return new Promise((resolve) => {
    const fileList = fileResolutions.map((r) => `<li>${r}</li>`).join('')
    const resOptions = resolutionOptions.map((opt, i) => `
      <label class="scaling-option resolution-radio">
        <input type="radio" name="targetRes" value="${i}" ${i === 0 ? 'checked' : ''}>
        <span><strong>${opt.label}</strong></span>
      </label>
    `).join('')

    const overlay = createOverlay(`
      <div class="modal-content resolution-modal">
        <div class="modal-header"><h3>&#9888;&#65039; 解像度が異なります</h3></div>
        <div class="modal-body">
          <p>入力ファイルの解像度が統一されていません：</p>
          <ul class="resolution-list">${fileList}</ul>

          <div class="resolution-target">
            <strong>&#127919; 出力解像度を選択</strong>
            <span class="resolution-note">（再エンコード時に基準となる解像度）</span>
            ${resOptions}
          </div>

          <div class="scaling-options">
            <p><strong>映像のサイズ合わせ方：</strong></p>
            <label class="scaling-option">
              <input type="radio" name="scalingMode" value="crop" checked>
              <span>
                <strong>クロップ</strong>（推奨・黒フチなし）<br>
                <small>画面全体に拡大し、はみ出た部分をカット。端が少し切れます。</small>
              </span>
            </label>
            <label class="scaling-option">
              <input type="radio" name="scalingMode" value="letterbox">
              <span>
                <strong>レターボックス</strong><br>
                <small>アスペクト比を維持。余白は黒フチで埋めます。</small>
              </span>
            </label>
          </div>

          <p class="copy-note">
            <strong>そのまま結合</strong>: 再エンコードなしで高速ですが、
            解像度が異なると映像が乱れる場合があります。
          </p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-success" id="m-reencode">再エンコードして結合</button>
          <button class="btn btn-secondary" id="m-copy">そのまま結合</button>
          <button class="btn btn-outline" id="m-cancel">キャンセル</button>
        </div>
      </div>
    `)

    const getSelected = (): ResolutionOption => {
      const checked = overlay.querySelector<HTMLInputElement>('input[name="targetRes"]:checked')
      const idx = checked ? parseInt(checked.value) : 0
      return resolutionOptions[idx] ?? resolutionOptions[0]
    }
    const getScalingMode = (): 'letterbox' | 'crop' => {
      const checked = overlay.querySelector<HTMLInputElement>('input[name="scalingMode"]:checked')
      return (checked?.value ?? 'letterbox') as 'letterbox' | 'crop'
    }

    const done = (choice: ResolutionChoice) => { remove(overlay); resolve(choice) }
    overlay.querySelector('#m-reencode')!.addEventListener('click', () => {
      const { width, height } = getSelected()
      done({ action: 'reencode', scalingMode: getScalingMode(), targetWidth: width, targetHeight: height })
    })
    overlay.querySelector('#m-copy')!.addEventListener('click', () => done({ action: 'copy' }))
    overlay.querySelector('#m-cancel')!.addEventListener('click', () => done({ action: 'cancel' }))
    overlay.addEventListener('click', (e) => { if (e.target === overlay) done({ action: 'cancel' }) })
  })
}

export function showCancelDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = createOverlay(`
      <div class="modal-content cancel-modal">
        <div class="modal-header"><h3>&#9888;&#65039; ファイルを削除しますか？</h3></div>
        <div class="modal-body">
          <p>作成されたファイルを削除します。</p>
          <p class="warning-text">この操作は取り消せません。</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-danger" id="m-confirm">削除する</button>
          <button class="btn btn-secondary" id="m-keep">キャンセル</button>
        </div>
      </div>
    `)

    const done = (v: boolean) => { remove(overlay); resolve(v) }
    overlay.querySelector('#m-confirm')!.addEventListener('click', () => done(true))
    overlay.querySelector('#m-keep')!.addEventListener('click', () => done(false))

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); done(false) } }
    document.addEventListener('keydown', onKey)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { document.removeEventListener('keydown', onKey); done(false) } })
  })
}

export function showSuccessModal(filePath: string, onOpen: () => void, onClose: () => void): void {
  const overlay = createOverlay(`
    <div class="modal-content success-modal">
      <div class="modal-header"><h3>&#9989; 結合完了!</h3></div>
      <div class="modal-body">
        <p>動画の結合が正常に完了しました。</p>
        <div class="file-path-display">
          <strong>保存先:</strong><br>
          <code>${filePath}</code>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="m-open">フォルダを開く</button>
        <button class="btn btn-secondary" id="m-close">閉じる</button>
      </div>
    </div>
  `)

  overlay.querySelector('#m-open')!.addEventListener('click', () => { remove(overlay); onOpen() })
  overlay.querySelector('#m-close')!.addEventListener('click', () => { remove(overlay); onClose() })
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { remove(overlay); onClose() } })
}

export function showDeleteErrorModal(filePath: string, errorMessage: string, onOpen: () => void): void {
  const overlay = createOverlay(`
    <div class="modal-content error-modal">
      <div class="modal-header"><h3>&#9888;&#65039; ファイル削除エラー</h3></div>
      <div class="modal-body">
        <p>ファイルの削除に失敗しました。</p>
        <div class="error-details">
          <strong>ファイル:</strong><br><code>${filePath}</code><br><br>
          <strong>エラー:</strong><br><span class="error-message">${errorMessage}</span>
        </div>
        <div class="manual-delete-info">
          <h4>手動での削除方法:</h4>
          <ol>
            <li>ファイルを使用している他のプログラムを終了</li>
            <li>エクスプローラーでファイルを右クリック → 削除</li>
            <li>管理者権限のコマンドプロンプトで:<br><code>del /f "${filePath}"</code></li>
          </ol>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="m-open">フォルダを開く</button>
        <button class="btn btn-secondary" id="m-close">閉じる</button>
      </div>
    </div>
  `)

  overlay.querySelector('#m-open')!.addEventListener('click', () => { remove(overlay); onOpen() })
  overlay.querySelector('#m-close')!.addEventListener('click', () => remove(overlay))
  overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(overlay) })
}
