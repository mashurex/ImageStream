var PopupWindow = function ($triggers, objOptions) {
  var self = this;
  this.$elTriggers = $triggers;
  this.options = $.extend({
    popupName: 'popup',
    width: 600,
    height: 400,
    xtras: 'location=no,menubar=no,statusbar=no,toolbar=no,scrollbars=no,resizable=yes'
  }, objOptions || {});
  this.features = 'width=' + this.options.width + ',height=' + this.options.height + ',' + this.options.xtras;
  this.$elTriggers.bind('click', function click(e) {
    e.preventDefault();
    var $el = $(e.currentTarget);
    self.openPopup($el);
  });
};

PopupWindow.prototype = {
  openPopup: function openPopup($el) {
    var url = $el.attr('href');
    var win = window.open(url, this.options.popupName, this.features);
    win.focus();
  }
};