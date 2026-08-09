/**
 * @module bp-wechat-custom-tab-bar
 * @lang zh-CN 微信官方 custom tabBar 的最小受控 runtime：拥有四个静态主页面、两种静态 label、当前选中值和 `wx.switchTab` 意图，不读取业务、用户、storage、网络或动态配置。
 * @lang en Minimum controlled runtime for the official WeChat custom tab bar: owns four static primary pages, two static labels, the current selection, and `wx.switchTab` intent, and reads no business data, user, storage, network, or dynamic configuration.
 */

// <lang><zh-CN>向微信注册唯一 custom-tab-bar 组件；所有状态均为本组件实例局部值。</zh-CN><en>Register the sole custom-tab-bar component with WeChat; every state value remains local to this component instance.</en></lang>
Component({
  // <lang><zh-CN>初始首页/中文值保证首次绘制永不为空；各 tab 页 onShow 会同步真实选中态与 runtime locale。</zh-CN><en>Initial Home/Chinese values keep the first paint nonempty; each tab page's onShow synchronizes the actual selection and runtime locale.</en></lang>
  data: {
    selected: 'home',
    locale: 'zh-Hans',
    items: [
      // <lang><zh-CN>首页项只指向仓内的两张原创图标与固定主页路由，选中态不依赖运行时着色。</zh-CN><en>The Home item points only to two in-repository original icons and a fixed primary route; its selected state does not depend on runtime tinting.</en></lang>
      {
        value: 'home',
        labelZh: '首页',
        labelEn: 'Home',
        pagePath: '/pages/home/index',
        icon: '/static/icons/tab-home.svg',
        activeIcon: '/static/icons/tab-home-active.svg'
      },
      // <lang><zh-CN>发现项使用静态指南针图标对，它不接收位置或地图数据。</zh-CN><en>The Discover item uses a static compass-icon pair and accepts no location or map data.</en></lang>
      {
        value: 'discover',
        labelZh: '发现',
        labelEn: 'Discover',
        pagePath: '/pages/discover/index',
        icon: '/static/icons/tab-discover.svg',
        activeIcon: '/static/icons/tab-discover-active.svg'
      },
      // <lang><zh-CN>预约项使用静态日历图标对，图标本身不读取或表示真实库存。</zh-CN><en>The bookings item uses a static calendar-icon pair; the icon itself reads or represents no live inventory.</en></lang>
      {
        value: 'reservations',
        labelZh: '我的预约',
        labelEn: 'My bookings',
        pagePath: '/pages/reservations/index',
        icon: '/static/icons/tab-reservations.svg',
        activeIcon: '/static/icons/tab-reservations-active.svg'
      },
      // <lang><zh-CN>个人信息项使用静态人像轮廓图标对，不读取真实头像或身份信息。</zh-CN><en>The Profile item uses a static person-outline icon pair and reads no real avatar or identity information.</en></lang>
      {
        value: 'profile',
        labelZh: '个人信息',
        labelEn: 'Profile',
        pagePath: '/pages/profile/index',
        icon: '/static/icons/tab-profile.svg',
        activeIcon: '/static/icons/tab-profile-active.svg'
      }
    ]
  },

  // <lang><zh-CN>methods 只接收本地点击并投影为固定主页面切换。</zh-CN><en>Methods receive only local clicks and project them into fixed primary-page switches.</en></lang>
  methods: {
    /**
     * @lang zh-CN 处理一个 tab 点击：从静态 items allowlist 解析 value，先更新当前实例选中态，再调用固定 `wx.switchTab`；失败时恢复原选中态。
     * @lang en Handles one tab click: resolves the value from the static items allowlist, updates this instance's selection first, then calls fixed `wx.switchTab`; restores the previous selection on failure.
     * @param {object} event <lang><zh-CN>微信提供的本地 tap event。</zh-CN><en>Local tap event supplied by WeChat.</en></lang>
     * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
     */
    handleSelect(event) {
      // <lang><zh-CN>dataset 只作为 allowlist lookup key；它不能成为 URL 或任意命令。</zh-CN><en>The dataset serves only as an allowlist lookup key and cannot become a URL or arbitrary command.</en></lang>
      const candidateValue = event?.currentTarget?.dataset?.value;
      // <lang><zh-CN>从本实例静态 items 查找完整声明；未知、重复点击或缺失 wx API 保持零副作用。</zh-CN><en>Find the complete declaration from this instance's static items; an unknown value, repeated click, or missing wx API retains zero side effect.</en></lang>
      const selectedItem = this.data.items.find((item) => item.value === candidateValue);
      if (!selectedItem || selectedItem.value === this.data.selected || typeof wx === 'undefined' || typeof wx.switchTab !== 'function') return;

      // <lang><zh-CN>保存旧值并立即更新常驻底栏，避免等待目标页面创建时出现空白或延迟选中态。</zh-CN><en>Retain the old value and update the persistent bottom bar immediately, avoiding a blank or delayed selection while the target page is created.</en></lang>
      const previousSelection = this.data.selected;
      this.setData({ selected: selectedItem.value });

      // <lang><zh-CN>URL 只来自静态声明；异步失败只恢复本组件选中态，不改写页面、locale 或业务数据。</zh-CN><en>The URL comes only from the static declaration; asynchronous failure restores only this component's selection and rewrites no page, locale, or business data.</en></lang>
      wx.switchTab({
        url: selectedItem.pagePath,
        fail: () => this.setData({ selected: previousSelection })
      });
    }
  }
});
