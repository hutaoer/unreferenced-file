/**
 * 按钮组件
 */
import './index.css';
export interface ButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export class Button {
  private props: ButtonProps;

  constructor(props: ButtonProps) {
    this.props = props;
  }

  render(): string {
    const { text, disabled, variant = 'primary' } = this.props;
    const className = `btn btn-${variant} ${disabled ? 'disabled' : ''}`;
    return `<button class="${className}">${text}</button>`;
  }

  click(): void {
    if (!this.props.disabled) {
      this.props.onClick();
    }
  }
}
