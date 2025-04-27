/**
 * 确认对话框工具类
 * 一个可重用的确认对话框组件，支持自定义标题、内容、按钮文本等
 * @author Code God
 */
export class ConfirmDialog {
  /**
   * 创建一个新的确认对话框实例
   * @param {Object} options - 配置选项
   * @param {string} [options.title='确认操作'] - 对话框标题
   * @param {string} [options.content='您确定要执行此操作吗？'] - 对话框内容
   * @param {string} [options.confirmText='确认'] - 确认按钮文本
   * @param {string} [options.cancelText='取消'] - 取消按钮文本
   * @param {string} [options.theme='dark'] - 主题 ('dark' 或 'light')
   * @param {Function} [options.onConfirm=null] - 确认回调函数
   * @param {Function} [options.onCancel=null] - 取消回调函数
   * @param {boolean} [options.showNotification=true] - 是否显示操作成功通知
   * @param {string} [options.notificationText='操作已成功完成'] - 通知文本
   * @param {number} [options.notificationDuration=3000] - 通知显示时间(毫秒)
   */
  constructor(options = {}) {
    this.options = {
      title: options.title || '确认操作',
      content: options.content || '您确定要执行此操作吗？',
      confirmText: options.confirmText || '确认',
      cancelText: options.cancelText || '取消',
      theme: options.theme || 'dark',
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
      showNotification: options.showNotification !== undefined ? options.showNotification : true,
      notificationText: options.notificationText || '操作已成功完成',
      notificationDuration: options.notificationDuration || 3000
    };
    
    this.modalId = 'confirm-dialog-' + Math.random().toString(36).substring(2, 9);
    this.notificationId = 'notification-' + Math.random().toString(36).substring(2, 9);
    
    this.init();
  }
  
  /**
   * 初始化对话框
   * @private
   */
  init() {
    // 创建样式
    this.createStyles();
    
    // 创建对话框元素
    this.createDialogElement();
    
    // 创建通知元素
    if (this.options.showNotification) {
      this.createNotificationElement();
    }
    
    // 绑定事件
    this.bindEvents();
  }
  
  /**
   * 创建样式
   * @private
   */
  createStyles() {
    // 检查是否已存在样式
    if (document.getElementById('confirm-dialog-styles')) {
      return;
    }
    
    const isDark = this.options.theme === 'dark';
    const colors = isDark ? {
      background: '#2d3142',
      foreground: '#e9e9e9',
      modalBg: '#363b4e',
      border: '#444a5e',
      accent: '#ff69b4',
      muted: '#a0a0a0',
      btnBg: '#444a5e',
      btnHoverBg: '#535a70'
    } : {
      background: '#f6f8fa',
      foreground: '#24292e',
      modalBg: '#ffffff',
      border: '#e1e4e8',
      accent: '#ff69b4',
      muted: '#586069',
      btnBg: '#f3f4f6',
      btnHoverBg: '#e1e4e8'
    };
    
    const style = document.createElement('style');
    style.id = 'confirm-dialog-styles';
    style.textContent = `
      .cd-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, ${isDark ? '0.7' : '0.5'});
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s;
      }
      
      .cd-modal-overlay.active {
        opacity: 1;
        visibility: visible;
      }
      
      .cd-modal {
        background-color: ${colors.modalBg};
        width: 90%;
        max-width: 450px;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, ${isDark ? '0.3' : '0.15'});
        transform: translateY(-20px);
        transition: transform 0.3s;
        border: 1px solid ${colors.border};
        color: ${colors.foreground};
      }
      
      .cd-modal-overlay.active .cd-modal {
        transform: translateY(0);
      }
      
      .cd-modal-header {
        background-color: ${isDark ? colors.background : colors.modalBg};
        padding: 15px 20px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid ${colors.border};
      }
      
      .cd-modal-header .cd-warning-icon {
        color: ${colors.accent};
        font-size: 24px;
        margin-right: 10px;
      }
      
      .cd-modal-header h3 {
        color: ${colors.accent};
        margin: 0;
        font-weight: 500;
      }
      
      .cd-modal-body {
        padding: 20px;
        color: ${colors.foreground};
      }
      
      .cd-modal-footer {
        padding: 15px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        border-top: 1px solid ${colors.border};
      }
      
      .cd-btn {
        padding: 10px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
        border: none;
      }
      
      .cd-btn-cancel {
        background-color: ${colors.btnBg};
        color: ${colors.foreground};
      }
      
      .cd-btn-cancel:hover {
        background-color: ${colors.btnHoverBg};
      }
      
      .cd-btn-confirm {
        background-color: ${colors.accent};
        color: white;
      }
      
      .cd-btn-confirm:hover {
        background-color: ${isDark ? '#ff4aa7' : '#e5509f'};
      }
      
      .cd-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: ${colors.background};
        color: ${colors.foreground};
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, ${isDark ? '0.3' : '0.15'});
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s;
        border: 1px solid ${colors.accent};
        z-index: 9999;
      }
      
      .cd-notification.show {
        transform: translateY(0);
        opacity: 1;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * 创建对话框元素
   * @private
   */
  createDialogElement() {
    // 检查是否已存在对话框
    if (document.getElementById(this.modalId)) {
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'cd-modal-overlay';
    modal.id = this.modalId;
    
    modal.innerHTML = `
      <div class="cd-modal">
        <div class="cd-modal-header">
          <span class="cd-warning-icon">⚠️</span>
          <h3>${this.options.title}</h3>
        </div>
        <div class="cd-modal-body">
          <p>${this.options.content}</p>
        </div>
        <div class="cd-modal-footer">
          <button class="cd-btn cd-btn-cancel">${this.options.cancelText}</button>
          <button class="cd-btn cd-btn-confirm">${this.options.confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 获取按钮引用
    this.cancelBtn = modal.querySelector('.cd-btn-cancel');
    this.confirmBtn = modal.querySelector('.cd-btn-confirm');
    this.modalElement = modal;
  }
  
  /**
   * 创建通知元素
   * @private
   */
  createNotificationElement() {
    // 检查是否已存在通知
    if (document.getElementById(this.notificationId)) {
      return;
    }
    
    const notification = document.createElement('div');
    notification.className = 'cd-notification';
    notification.id = this.notificationId;
    notification.textContent = this.options.notificationText;
    
    document.body.appendChild(notification);
    this.notificationElement = notification;
  }
  
  /**
   * 绑定事件
   * @private
   */
  bindEvents() {
    // 取消按钮点击事件
    this.cancelBtn.addEventListener('click', () => {
      this.hide();
      if (typeof this.options.onCancel === 'function') {
        this.options.onCancel();
      }
    });
    
    // 确认按钮点击事件
    this.confirmBtn.addEventListener('click', () => {
      this.hide();
      if (typeof this.options.onConfirm === 'function') {
        this.options.onConfirm();
      }
      if (this.options.showNotification) {
        this.showNotification();
      }
    });
    
    // 点击背景关闭对话框
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.hide();
        if (typeof this.options.onCancel === 'function') {
          this.options.onCancel();
        }
      }
    });
  }
  
  /**
   * 显示对话框
   * @param {Object} [options] - 可选的临时配置选项
   * @returns {ConfirmDialog} 当前实例，支持链式调用
   */
  show(options = {}) {
    // 更新临时选项
    if (options.title) {
      this.modalElement.querySelector('.cd-modal-header h3').textContent = options.title;
    }
    
    if (options.content) {
      this.modalElement.querySelector('.cd-modal-body p').textContent = options.content;
    }
    
    if (options.confirmText) {
      this.confirmBtn.textContent = options.confirmText;
    }
    
    if (options.cancelText) {
      this.cancelBtn.textContent = options.cancelText;
    }
    
    if (options.onConfirm) {
      this.options.onConfirm = options.onConfirm;
    }
    
    if (options.onCancel) {
      this.options.onCancel = options.onCancel;
    }
    
    // 显示对话框
    this.modalElement.classList.add('active');
    
    return this;
  }
  
  /**
   * 隐藏对话框
   * @returns {ConfirmDialog} 当前实例，支持链式调用
   */
  hide() {
    this.modalElement.classList.remove('active');
    return this;
  }
  
  /**
   * 显示通知
   * @param {string} [text] - 可选的通知文本
   * @returns {ConfirmDialog} 当前实例，支持链式调用
   */
  showNotification(text) {
    if (!this.options.showNotification) return this;
    
    if (text) {
      this.notificationElement.textContent = text;
    }
    
    this.notificationElement.classList.add('show');
    
    setTimeout(() => {
      this.notificationElement.classList.remove('show');
    }, this.options.notificationDuration);
    
    return this;
  }
  
  /**
   * 更新对话框选项
   * @param {Object} options - 新的配置选项
   * @returns {ConfirmDialog} 当前实例，支持链式调用
   */
  updateOptions(options = {}) {
    Object.assign(this.options, options);
    
    // 更新对话框内容
    if (options.title) {
      this.modalElement.querySelector('.cd-modal-header h3').textContent = options.title;
    }
    
    if (options.content) {
      this.modalElement.querySelector('.cd-modal-body p').textContent = options.content;
    }
    
    if (options.confirmText) {
      this.confirmBtn.textContent = options.confirmText;
    }
    
    if (options.cancelText) {
      this.cancelBtn.textContent = options.cancelText;
    }
    
    return this;
  }
  
  /**
   * 销毁对话框实例
   */
  destroy() {
    // 移除事件监听
    this.cancelBtn.removeEventListener('click', this.hide);
    this.confirmBtn.removeEventListener('click', this.hide);
    this.modalElement.removeEventListener('click', this.hide);
    
    // 移除DOM元素
    if (this.modalElement && this.modalElement.parentNode) {
      this.modalElement.parentNode.removeChild(this.modalElement);
    }
    
    if (this.notificationElement && this.notificationElement.parentNode) {
      this.notificationElement.parentNode.removeChild(this.notificationElement);
    }
  }
}