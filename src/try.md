# Try it

Try a URL below to see what unrot will return. You'll see the redirected URL from the query and the timings. If JavaScript is disabled, the browser will follow the redirect.

<form id="try-form" action="/" method="get">
  <fieldset class="flex-fields">
    <label for="url">URL: </label>
    <input name="url" id="url" type="url">
    <input name="timeout" type="hidden" value="5000">
    <button>Test now</button>
  </fieldset>
</form>
<output></output>

Try some examples: [haveamint.com](https://haveamint.com), [new-life.net/st-nick](http://www.new-life.net/st-nick.htm), [andybudd.com/win_an_ipod...](http://www.andybudd.com/archives/2006/12/win_an_ipod_nano_with_css_mastery_this_christmas/index.php), [remysharp.com](https://remysharp.com) (please [contribute](https://github.com/remy/unrot.link/issues/new){data-ignore="true"} better examples!) {.samples}

---

To add this to your own site:

1. Add the [redirect.js](/static/redirect.js) to your own server and include the script
2. Request your site [has access](/access)
3. Find out more about the [hosted service](/docs/hosted)

<script src="/static/try.js"></script>
<script src="/static/redirect.js"></script>
