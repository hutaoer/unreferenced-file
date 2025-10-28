/**
 * 模态框组件
 * 这个组件还没有被使用
 */

export interface ModalProps {
  title: string;
  content: string;
  onClose: () => void;
  show: boolean;
}

export class Modal {
  private props: ModalProps;

  constructor(props: ModalProps) {
    this.props = props;
  }

  render(): string {
    if (!this.props.show) return '';
    
    return `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>${this.props.title}</h3>
            <button class="close-btn" onclick="closeModal()">×</button>
          </div>
          <div class="modal-body">
            ${this.props.content}
          </div>
        </div>
      </div>
    `;
  }

  close(): void {
    this.props.onClose();
  }
}
