/**
 * @constructor
 */
var FileUploadDialog = function () {
    ModalDialog.call(this);
    this._className = 'file-upload-dialog';
    this._post_upload_handler = undefined;
    this._fileType = 'image';
    this._headerEnabled = false;
};
inherits(FileUploadDialog, ModalDialog);

/**
 * allowed values: 'image', 'attachment'
 */
FileUploadDialog.prototype.setFileType = function (fileType) {
    this._fileType = fileType;
};

FileUploadDialog.prototype.getFileType = function () {
    return this._fileType;
};

FileUploadDialog.prototype.setButtonText = function (text) {
    this._fakeInput.val(text);
};

FileUploadDialog.prototype.setPostUploadHandler = function (handler) {
    this._post_upload_handler = handler;
};

FileUploadDialog.prototype.runPostUploadHandler = function (url, descr) {
    this._post_upload_handler(url, descr);
};

FileUploadDialog.prototype.setInputId = function (id) {
    this._input_id = id;
};

FileUploadDialog.prototype.getInputId = function () {
    return this._input_id;
};

FileUploadDialog.prototype.setErrorText = function (text) {
    this.setLabelText(text);
    this._label.addClass('error');
};

FileUploadDialog.prototype.setLabelText = function (text) {
    this._label.html(text);
    this._label.removeClass('error');
};

FileUploadDialog.prototype.setUrlInputTooltip = function (text) {
    this._url_input_tooltip = text;
};

FileUploadDialog.prototype.getUrl = function () {
    var url_input = this._url_input;
    if (url_input.isBlank() === false) {
        return url_input.getVal();
    }
    return '';
};

//disable description for now
//FileUploadDialog.prototype.getDescription = function () {
//    return this._description_input.getVal();
//};

FileUploadDialog.prototype.resetInputs = function () {
    this._url_input.reset();
    //this._description_input.reset();
    this._upload_input.val('');
};

FileUploadDialog.prototype.getInputElement = function () {
    return $('#' + this.getInputId());
};

FileUploadDialog.prototype.installFileUploadHandler = function (handler) {
    var upload_input = this.getInputElement();
    upload_input.unbind('change');
    //todo: fix this - make event handler reinstall work
    upload_input.change(handler);
};

FileUploadDialog.prototype.show = function () {
    //hack around the ajaxFileUpload plugin
    FileUploadDialog.superClass_.show.call(this);
    var handler = this.getStartUploadHandler();
    this.installFileUploadHandler(handler);
};

FileUploadDialog.prototype.getUrlInputElement = function () {
    return this._url_input.getElement();
};

/*
 * argument startUploadHandler is very special it must
 * be a function calling this one!!! Todo: see if there
 * is a more civilized way to do this.
 */
FileUploadDialog.prototype.startFileUpload = function (startUploadHandler) {

    var spinner = this._spinner;
    var label = this._label;

    spinner.ajaxStart(function () {
        spinner.show();
        label.hide();
    });
    spinner.ajaxComplete(function () {
        spinner.hide();
        label.show();
    });

    /* important!!! upload input must be loaded by id
     * because ajaxFileUpload monkey-patches the upload form */
    var uploadInput = this.getInputElement();
    uploadInput.ajaxStart(function () { uploadInput.hide(); });
    uploadInput.ajaxComplete(function () { uploadInput.show(); });

    //var localFilePath = upload_input.val();

    var me = this;

    $.ajaxFileUpload({
        url: askbot.urls.upload,
        secureuri: false,//todo: check on https
        fileElementId: this.getInputId(),
        dataType: 'xml',
        success: function (data, status) {

            var fileURL = $(data).find('file_url').text();
            var origFileName = $(data).find('orig_file_name').text();
            var newStatus = interpolate(
                                gettext('Uploaded file: %s'),
                                [origFileName]
                            );
            /*
            * hopefully a fix for the "fakepath" issue
            * https://www.mediawiki.org/wiki/Special:Code/MediaWiki/83225
            */
            fileURL = fileURL.replace(/\w:.*\\(.*)$/, '$1');
            var error = $(data).find('error').text();
            if (error !== '') {
                me.setErrorText(error);
            } else {
                me.getUrlInputElement().prop('value', fileURL);
                me.setLabelText(newStatus);
                var buttonText = gettext('Choose a different file');
                if (me.getFileType() === 'image') {
                    buttonText = gettext('Choose a different image');
                }
                me.setButtonText(buttonText);
            }

            /* re-install this as the upload extension
             * will remove the handler to prevent double uploading
             * this hack is a manipulation around the
             * ajaxFileUpload jQuery plugin. */
            me.installFileUploadHandler(startUploadHandler);
        },
        error: function (data, status, e) {
            /* re-install this as the upload extension
            * will remove the handler to prevent double uploading */
            me.setErrorText(gettext('Oops, looks like we had an error. Sorry.'));
            me.installFileUploadHandler(startUploadHandler);
        }
    });
    return false;
};

FileUploadDialog.prototype.getStartUploadHandler = function () {
    var me = this;
    var handler = function () {
        /* the trick is that we need inside the function call
         * to have a reference to itself
         * in order to reinstall the handler later
         * because ajaxFileUpload jquery extension might be destroying it */
        return me.startFileUpload(handler);
    };
    return handler;
};

FileUploadDialog.prototype.createDom = function () {

    var superClass = FileUploadDialog.superClass_;

    var me = this;
    superClass.setAcceptHandler.call(this, function () {
        var url = $.trim(me.getUrl());
        //var description = me.getDescription();
        //@todo: have url cleaning code here
        if (url.length > 0) {
            me.runPostUploadHandler(url);//, description);
            me.resetInputs();
        }
        me.hide();
    });
    superClass.setRejectHandler.call(this, function () {
        me.resetInputs();
        me.hide();
    });
    superClass.createDom.call(this);

    var form = this.makeElement('form');
    form.addClass('ajax-file-upload');
    form.css('margin-bottom', 0);
    this.prependContent(form);

    // Browser native file upload field
    var upload_input = this.makeElement('input');
    upload_input.attr({
        id: this._input_id,
        type: 'file',
        name: 'file-upload'
        //size: 26???
    });
    form.append(upload_input);
    this._upload_input = upload_input;

    var fakeInput = this.makeElement('input');
    fakeInput.attr('type', 'button');
    fakeInput.addClass('submit');
    fakeInput.addClass('fake-file-input');
    var buttonText = gettext('Choose a file to insert');
    if (this._fileType === 'image') {
        buttonText = gettext('Choose an image to insert');
    }
    fakeInput.val(buttonText);
    this._fakeInput = fakeInput;
    form.append(fakeInput);

    setupButtonEventHandlers(fakeInput, function () { upload_input.click(); });

    // Label which will also serve as status display
    var label = this.makeElement('label');
    label.attr('for', this._input_id);
    var types = askbot.settings.allowedUploadFileTypes;
    types = types.join(', ');
    label.html(gettext('Allowed file types are:') + ' ' + types + '.');
    form.append(label);
    this._label = label;

    // The url input text box, probably unused in fact
    var url_input = new TippedInput();
    url_input.setInstruction(this._url_input_tooltip || gettext('Or paste file url here'));
    var url_input_element = url_input.getElement();
    url_input_element.css({
        'width': '200px',
        'display': 'none'
    });
    form.append(url_input_element);
    //form.append($('<br/>'));
    this._url_input = url_input;

    /* //Description input box
    var descr_input = new TippedInput();
    descr_input.setInstruction(gettext('Describe the image here'));
    this.makeElement('input');
    form.append(descr_input.getElement());
    form.append($('<br/>'));
    this._description_input = descr_input;
    */
    var spinner = this.makeElement('img');
    spinner.attr('src', mediaUrl('media/images/ajax-loader.gif'));
    spinner.css('display', 'none');
    spinner.addClass('spinner');
    form.append(spinner);
    this._spinner = spinner;

    upload_input.change(this.getStartUploadHandler());
};
