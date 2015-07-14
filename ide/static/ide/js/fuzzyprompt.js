CloudPebble.FuzzyPrompt = (function() {
    var fuse;
    var prompt, input, results;
    var previously_active;
    var sources = [];
    var item_list = [];
    var initialised = false;
    var selected_id = null;
    var default_item;
    // While manual is false, always highlight the first item
    var manual = false;

    var init = function() {
        if (!initialised) {
            // Set up the fuzzy matcher
            var options = {
                caseSensitive: false,
                includeScore: false,
                shouldSort: true,
                threshold: 0.6,
                location: 0,
                distance: 100,
                maxPatternLength: 32,
                keys: ["name"]
            };
            fuse = new Fuse([], options);

            input = $('#fuzzy-prompt-input-value');
            prompt = $('#fuzzy-prompt');
            results = $('#fuzzy-results');

            // Register ctrl-p and ctrl-shift-p
            $(document).keydown(function(e) {
               if (e.ctrlKey && e.keyCode == 80) {
                   var kind = (e.shiftKey ? 'commands' : 'files');
                   show_prompt(kind);
                   e.preventDefault();
               }
            });

            prompt.keydown(function (e) {
                // Ctrl-P to hide
                if (e.ctrlKey && e.keyCode == 80) {
                    hide_prompt();
                }
                // Enter to select
                else if (e.keyCode == 13) {
                    select_match(item_list[selected_id]);
                }
                // Up and down to switch between items
                // Use e.preventDefault so arrow keys don't navigate the text
                else if (e.keyCode == 40) {
                    move(1);
                    e.preventDefault();
                }
                else if (e.keyCode == 38) {
                    move(-1);
                    e.preventDefault();
                }

            });

            prompt.on('input', function() {
                var matches = current_matches();

                // Reset the results list
                results.empty();
                _.each(item_list, function(item) {
                    item.rank = null;
                });

                // Build the new results list
                if (matches.length > 0) {
                    _.each(matches, function(match, rank) {
                        match.menu_item.appendTo(results);
                        match.rank = rank;
                    });
                    // Highlight the first item if the previously highlighted item disappears
                    // or the user has not been using the arrow keys
                    if (!manual || !(_.chain(matches).pluck('id')).contains(selected_id).value()) {
                        highlight_item(matches[0]);
                    }
                }
                else {
                    manual = false;
                    selected_id = null;
                }
            });

            prompt.on('shown.bs.modal', function () {
                input.focus();
                input.val("");
            });
        }
    };

    var move = function(jump) {
        var selected = item_list[selected_id];
        var children = results.children();
        var new_rank = Math.max(Math.min(selected.rank + jump, children.length-1), 0);
        var new_selection = _.where(item_list, {rank: new_rank})[0];
        manual = true;
        highlight_item(new_selection);
    };

    var current_matches = function() {
        var parts = input.val().split(":", 2);
        if (parts[0].length == 0) {
            if (_.isUndefined(parts[1]))
                return item_list;
            else {
                return _.where(item_list, {name: default_item});
            }
        }
        else {
            return fuse.search(parts[0]);
        }
    };

    var select_match = function(match) {
        match.callback(match.object, input.val());
        hide_prompt();
    };

    var show_prompt = function(kind) {
        previously_active = document.activeElement;
        prompt.modal('show');
        item_list = [];
        results.empty();
        manual = false;
        // Build up the list of files to search through
        var id = 0;
        _.each(sources, function(source) {
            if (source.kind == kind) {
                _.each(source.list_func(), function (object, name) {
                    var menu_item = $("<div></div>");
                    menu_item.text(name).appendTo(results);
                    (function () {
                        var this_id = id;
                        menu_item.on('click', function () {
                            select_match(item_list[this_id]);
                        });
                    })();

                    item_list.push({
                        name: name,
                        callback: source.callback,
                        object: object,
                        id: id,
                        menu_item: menu_item,
                        rank: id
                    });
                    id++;
                });
            }
        });
        fuse.set(item_list);
        highlight_item_by_id(0);
    };

    var highlight_item = function(item) {
        highlight_item_by_id(item.id);
    };

    var highlight_item_by_id = function(id) {
        _.each(item_list, function(item) {
            if (item.id == id) {
                item.menu_item.addClass('selected');
            }
            else {
                item.menu_item.removeClass('selected');
            }
        });
        selected_id = id;
    };

    var hide_prompt = function() {
        prompt.modal('hide');
        setTimeout(function() {
            $(previously_active).focus();
        }, 1);

    };

    return {
        SetCurrentItemName: function(item_name) {
            default_item = item_name;
        },
        Show: function() {
            show_prompt();
        },
        AddDataSource: function(kind, item_getter, select_callback) {
            sources.push({list_func: item_getter, callback: select_callback, kind: kind});
        },
        Init: function() {
            init();
        }
    }
})();