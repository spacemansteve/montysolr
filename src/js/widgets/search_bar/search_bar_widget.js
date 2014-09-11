define(['marionette',
    'js/components/api_query',
    'js/widgets/base/base_widget',
    'hbs!./templates/search_bar_template',
    'hbs!./templates/search_form_template',
    'js/components/query_builder/plugin',
    'bootstrap',
    'hoverIntent',

  ],
  function (Marionette, ApiQuery, BaseWidget, SearchBarTemplate, SearchFormTemplate, QueryBuilderPlugin) {


    $.fn.selectRange = function (start, end) {
      if (!end) end = start;
      return this.each(function () {
        if (this.setSelectionRange) {
          this.focus();
          this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
          var range = this.createTextRange();
          range.collapse(true);
          range.moveEnd('character', end);
          range.moveStart('character', start);
          range.select();
        }
      });
    };

    var SearchBarView = Marionette.ItemView.extend({

      template: SearchBarTemplate,

      initialize: function (options) {
        _.bindAll(this, "tempFieldInsert", "tempFieldClear");
        this.queryBuilder = new QueryBuilderPlugin();
        // this.queryBuilder.loadCss(); // not needed since we have it in style.css
      },

      activate: function(beehive) {
        this.queryBuilder.setQTreeGetter(QueryBuilderPlugin.buildQTreeGetter(beehive));
        var that = this;
        this.queryBuilder.attachHeartBeat(function() {
          that.onBuilderChange();
        });
        this.beehive = beehive;
      },

      onBuilderChange: function() {
        if (this.queryBuilder.isDirty()) {
          var newQuery = this.queryBuilder.getQuery();
          this.setFormVal(newQuery);
        }
      },

      onRender: function () {
        this.delegateEvents();
        this.$("#search-form-container").append(SearchFormTemplate);

//        I think this is not acting perfectly if people hover and then enter text into
        // the input field without clicking.
//        this.$("#field-options div").hoverIntent(this.tempFieldInsert, this.tempFieldClear);
        this.$("#search-gui").append(this.queryBuilder.$el);

        return;

        this.queryBuilder = new QueryBuilderPlugin({el: '#search-gui'});
        this.queryBuilder.loadCss();
        this.queryBuilder.activate(this.beehive);
      },

      events: {

        "click #field-options div" : "tempFieldInsert",
        "keypress .q": function(e){
          this.highlightFields(e);
          this.setAddField();
        },
        "blur .q": "unHighlightFields",
        "click #search-form-container": function (e) {
          e.stopPropagation()
        },
        "click #search-form-container .title": "toggleFormSection",
        "click .show-form": "onShowForm",
        "submit form[name=main-query]": "submitQuery"
      },

      getFormVal: function() {
        return this.$(".q").val();
      },

      setFormVal: function(v) {
        return this.$(".q").val(v);
      },

      onShowForm: function() {
        var formVal = this.getFormVal();
        if (formVal.trim().length > 0) {
          this.queryBuilder.updateQueryBuilder(formVal);
        }
        else { // display a default form
          this.queryBuilder.setRules({
            "condition": "AND",
            "rules": [
              {
                "id": "author",
                "field": "author",
                "type": "string",
                "input": "text",
                "operator": "is",
                "value": ""
              },
              {
                "id": "title",
                "field": "title",
                "type": "string",
                "input": "text",
                "operator": "contains",
                "value": ""
              },
            ]
          });
        }

        // show the form
        this.specifyFormWidth();
      },

      specifyFormWidth: function () {
        this.$("#search-form-container").width(this.$(".input-group").width());
      },

      toggleFormSection: function (e) {
        var $p = $(e.target).parent();
        $p.next().toggleClass("hide");
        $p.toggleClass("search-form-header-active");
      },

      highlightFields: function () {
        this.$(".show-form").addClass("draw-attention")
      },

      unHighlightFields: function () {
        this.$(".show-form").removeClass("draw-attention")
      },

      tempFieldInsert: function (e) {
        e.preventDefault();

        var currentVal, newVal, df;

//        this.unsetAddField();

        currentVal = this.$(".q").val();
        this.priorVal = currentVal;

        df = $(e.target).attr("data-field");

        if (df.split("-")[0] === "operator") {
          //cache it for mouseleave events
          if (currentVal !== "") {
            newVal = df.split("-")[1] + "(" + currentVal + ")";
          } else {
            newVal = df.split("-")[1] + "( )";
          }
          this.$(".q").val(newVal);

        } else {

          //checking if first author
          if (df === "first-author") {
            newVal = currentVal + " author:\"^\"";
          } else {
            newVal = currentVal + " " + df + ":\"\"";
          }
          this.$(".q").val(newVal);
        }

        this.$(".q").focus();
        this.$(".q").selectRange(this.$(".q").val().length - 1);
      },

      tempFieldClear: function (e) {
        if (this.addField === true) {
          this.$(".q").focus();
          this.$(".q").selectRange(this.$(".q").val().length - 1);
          this.addField = false;
        }
        else {
          //assumption that final entry in query bar needs to be cleared
          this.$(".q").val(this.priorVal);
          this.priorVal = undefined;
        }
      },

      setAddField: function (e) {
        this.addField = true;
      },

      unsetAddField : function (e) {
        this.addField = false;
      },

      submitQuery: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var query = (this.$(".q").val());
        this.trigger("start_search", query);
      },

      setQueryBox: function (val) {
        (this.$(".q").val(val));
      }

    })

    var SearchBarWidget = BaseWidget.extend({

      activate: function (beehive) {
        this.pubsub = beehive.Services.get('PubSub');

        //custom dispatchRequest function goes here
        this.pubsub.subscribe(this.pubsub.INVITING_REQUEST, this.dispatchRequest);

        //custom handleResponse function goes here
        this.pubsub.subscribe(this.pubsub.DELIVERING_RESPONSE, this.processResponse);

        this.view.activate(beehive);
      },

      defaultQueryArguments: {
        //sort: 'date desc',
        fl: 'id'
      },

      storeQuery: function (query) {
        this.setCurrentQuery(query);
      },

      initialize: function (options) {
        this.currentQuery = undefined;
        this.view = new SearchBarView();
        this.listenTo(this.view, "start_search", function (query) {
          var newQuery = new ApiQuery({
            q: query
          });
          this.storeQuery(newQuery);
          this.navigate(newQuery);
        });

        this.listenTo(this.view, "render", function () {
          if (this.currentQuery) {
            this.view.setQueryBox(this.currentQuery)
          }
        })

        BaseWidget.prototype.initialize.call(this, options)
      },

      processResponse: function (apiResponse) {
        var q = apiResponse.getApiQuery();
        this.setCurrentQuery(q);
        this.view.setQueryBox(q.get('q').join(' '));
        this.storeQuery(q.get('q'));
      },

      navigate: function (newQuery) {

        this.pubsub.publish(this.pubsub.START_SEARCH, newQuery);

      }
    })


    return SearchBarWidget;


  });