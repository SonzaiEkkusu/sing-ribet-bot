import { Base64 } from "js-base64"

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function fetchConfig(url) {
  const response = await fetch(url);
  return await response.json();
}

async function fetchUrlAllOrigin(url) {
  let headers = new Headers({
    /*"Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Chrome/100"*/
  });
  const response = await fetch(`https://cors.sonzaix.workers.dev/?url=${url}`,
    /*{
      headers: headers
    }*/
  );
  return await response.text();
};

async function processData(inputData) {
  let lines = inputData.split('\n');
  lines = lines.filter(item => item !== '');
  if (lines.length > 200) {
    lines = lines.slice(0, 200);
  }
  inputData = lines.join('\n');
  replaceData = inputData.replace(/(\r?\n){1,2}/g, '\n');
  replaceData2 = replaceData.replace(/\n$/g, "");
  return replaceData2;
};

function ipChecker(str) {
  const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const ipv6Regex = /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$|([0-9A-Fa-f]{1,4}:){6}:[0-9A-Fa-f]{1,4}$|([0-9A-Fa-f]{1,4}:){5}(:[0-9A-Fa-f]{1,4}){1,2}$|([0-9A-Fa-f]{1,4}:){4}(:[0-9A-Fa-f]{1,4}){1,3}$|([0-9A-Fa-f]{1,4}:){3}(:[0-9A-Fa-f]{1,4}){1,4}$|([0-9A-Fa-f]{1,4}:){2}(:[0-9A-Fa-f]{1,4}){1,5}$|([0-9A-Fa-f]{1,4}:)(:[0-9A-Fa-f]{1,4}){1,6}$|:(:[0-9A-Fa-f]{1,4}){1,7}|fe80:(:[0-9A-Fa-f]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$|([0-9A-Fa-f]{1,4}:){1,4}:[0-9A-Fa-f]{1,4}(:[0-9A-Fa-f]{1,4}){1,4}$/;
  return ipv4Regex.test(str) || ipv6Regex.test(str);
}

async function v2rayToSing(v2rayAccount) {
  let v2rayArrayUrl = v2rayAccount.split('\n');
  let ftpArrayUrl = v2rayArrayUrl.map(urlString => urlString.replace(/^[^:]+(?=:\/\/)/, 'ftp')); //convert v2ray urls to ftp url since WHATWG URL API is suck when dealing with other protocol
  let resultParse = []

  function parseVmessUrl(ftpArrayUrl) {
    let ftpParsedUrl = ftpArrayUrl.substring(6)
    let decodeResult = Base64.decode(ftpParsedUrl);
    let parsedJSON = JSON.parse(decodeResult);
    const configResult = {
      tag: parsedJSON.ps || parsedJSON.add,
      type: "vmess",
      server: parsedJSON.add,
      server_port: ~~parsedJSON.port,
      uuid: parsedJSON.id,
      security: "auto",
      alter_id: ~~parsedJSON.aid,
      global_padding: false,
      authenticated_length: true,
      multiplex: {
        enabled: false,
        protocol: "smux",
        max_streams: 32
      }
    };
    if (parsedJSON.port === "443" || parsedJSON.tls === "tls") {
      configResult.tls = {
        enabled: true,
        server_name: parsedJSON.sni || parsedJSON.add,
        insecure: true,
        disable_sni: false
      };
    }
    if (parsedJSON.net === "ws") {
      configResult.transport = {
        type: parsedJSON.net,
        path: parsedJSON.path,
        headers: {
          Host: parsedJSON.host || parsedJSON.add
        },
        max_early_data: 0,
        early_data_header_name: "Sec-WebSocket-Protocol"
      };
    } else if (parsedJSON.net === "grpc") {
      configResult.transport = {
        type: parsedJSON.net,
        service_name: parsedJSON.path,
        idle_timeout: "15s",
        ping_timeout: "15s",
        permit_without_stream: false
      };
    }
    return configResult;
  }

  function parseVlessUrl(ftpArrayUrl) {
    let ftpParsedUrl = new URL(ftpArrayUrl)
    const configResult = {
      tag: ftpParsedUrl.hash.substring(1) || ftpParsedUrl.hostname,
      type: "vless",
      server: ftpParsedUrl.hostname,
      server_port: ~~ftpParsedUrl.port,
      uuid: ftpParsedUrl.username,
      flow: "",
      packet_encoding: "xudp",
      multiplex: {
        enabled: false,
        protocol: "smux",
        max_streams: 32
      }
    };
    if (ftpParsedUrl.port === "443" || ftpParsedUrl.searchParams.get("security") === "tls") {
      configResult.tls = {
        enabled: true,
        server_name: ftpParsedUrl.searchParams.get("sni"),
        insecure: true,
        disable_sni: false
      };
    }
    const transportTypes = {
      ws: {
        type: ftpParsedUrl.searchParams.get("type"),
        path: ftpParsedUrl.searchParams.get("path"),
        headers: {
          Host: ftpParsedUrl.searchParams.get("host")
        },
        max_early_data: 0,
        early_data_header_name: "Sec-WebSocket-Protocol"
      },
      grpc: {
        type: ftpParsedUrl.searchParams.get("type"),
        service_name: ftpParsedUrl.searchParams.get("serviceName"),
        idle_timeout: "15s",
        ping_timeout: "15s",
        permit_without_stream: false
      }
    };
    configResult.transport = transportTypes[ftpParsedUrl.searchParams.get("type")];
    return configResult;
  }

  function parseTrojanUrl(ftpArrayUrl) {
    let ftpParsedUrl = new URL(ftpArrayUrl)
    const configResult = {
      tag: ftpParsedUrl.hash.substring(1) || ftpParsedUrl.hostname,
      type: "trojan",
      server: ftpParsedUrl.hostname,
      server_port: ~~ftpParsedUrl.port,
      password: ftpParsedUrl.username,
      multiplex: {
        enabled: false,
        protocol: "smux",
        max_streams: 32
      }
    };
    if (ftpParsedUrl.port === "443" || ftpParsedUrl.searchParams.get("security") === "tls") {
      configResult.tls = {
        enabled: true,
        server_name: ftpParsedUrl.searchParams.get("sni"),
        insecure: true,
        disable_sni: false
      };
    }
    const transportTypes = {
      ws: {
        type: ftpParsedUrl.searchParams.get("type"),
        path: ftpParsedUrl.searchParams.get("path"),
        headers: {
          Host: ftpParsedUrl.searchParams.get("host")
        },
        max_early_data: 0,
        early_data_header_name: "Sec-WebSocket-Protocol"
      },
      grpc: {
        type: ftpParsedUrl.searchParams.get("type"),
        service_name: ftpParsedUrl.searchParams.get("serviceName"),
        idle_timeout: "15s",
        ping_timeout: "15s",
        permit_without_stream: false
      }
    };
    configResult.transport = transportTypes[ftpParsedUrl.searchParams.get("type")];
    return configResult;
  }

  function parseShadowsocksUrl(ftpArrayUrl) {
    let ftpParsedUrl = new URL(ftpArrayUrl)
    let encoded = decodeURIComponent(ftpParsedUrl.username);
    let decodeResult = atob(encoded);
    let shadowsocksPart = decodeResult.split(':');
    let pluginPart = ftpParsedUrl.searchParams.get("plugin").split(';')
    const configResult = {
      tag: ftpParsedUrl.hash.substring(1) || ftpParsedUrl.hostname,
      type: "shadowsocks",
      server: ftpParsedUrl.hostname,
      server_port: ~~ftpParsedUrl.port,
      method: shadowsocksPart[0],
      password: shadowsocksPart[1],
      plugin: pluginPart[0],
      plugin_opts: pluginPart.slice(1).join(';')
    };
    return configResult;
  }

  function parseShadowsocksRUrl(ftpArrayUrl) {
    let ftpParsedUrl = ftpArrayUrl.substring(6)
    let decodeResult = Base64.decode(ftpParsedUrl);
    let [serverSSR, portSSR, protocolSSR, methodSSR, obfsSSR, passwordSSR] = decodeResult.split(':');
    let params = new URLSearchParams(decodeResult.split('?')[1]);
    let obfs_paramSSR = params.get('obfsparam');
    let tagSSR = params.get('remarks');
    let proto_paramSSR = params.get('protoparam');
    const configResult = {
      tag: Base64.decode(tagSSR),
      type: "shadowsocksr",
      server: serverSSR,
      server_port: ~~portSSR,
      method: methodSSR,
      password: atob(passwordSSR.split('/')[0]),
      obfs: obfsSSR,
      obfs_param: atob(obfs_paramSSR),
      protocol: protocolSSR,
      protocol_param: atob(proto_paramSSR),
    };
    return configResult;
  }

  function parseSocksUrl(ftpArrayUrl) {
    let ftpParsedUrl = new URL(ftpArrayUrl)
    const configResult = {
      tag: ftpParsedUrl.hash.substring(1) || ftpParsedUrl.hostname,
      type: "socks",
      server: ftpParsedUrl.hostname,
      server_port: ~~ftpParsedUrl.port,
      password: ftpParsedUrl.username,
      version: "5"
    };
    return configResult;
  }

  function parseHttpUrl(ftpArrayUrl) {
    let ftpParsedUrl = new URL(ftpArrayUrl)
    const configResult = {
      tag: ftpParsedUrl.hash.substring(1) || ftpParsedUrl.hostname,
      type: "http",
      server: ftpParsedUrl.hostname,
      server_port: ~~ftpParsedUrl.port,
      password: ftpParsedUrl.username,
    };
    return configResult;
  }
  const protocolMap = {
    "vmess:": parseVmessUrl,
    "vless:": parseVlessUrl,
    "trojan:": parseTrojanUrl,
    "trojan-go:": parseTrojanUrl,
    "ss:": parseShadowsocksUrl,
    "ssr:": parseShadowsocksRUrl,
    "socks5:": parseSocksUrl,
    "http:": parseHttpUrl
  };
  let v2rayLength = v2rayArrayUrl.length
  for (let i = 0; i < v2rayLength; i++) {
    let v2rayParsedUrl = new URL(v2rayArrayUrl[i])
    //let ftpParsedUrl = new URL(ftpArrayUrl[i])
    let configResult
    const protocolHandler = protocolMap[v2rayParsedUrl.protocol];
    if (protocolHandler) {
      configResult = protocolHandler(ftpArrayUrl[i]);
    } else {
      console.log("Unsupported Protocol!")
    }
    const resultLength = resultParse.length;
    resultParse[resultLength] = configResult;
  }
  return resultParse
  //let singStringify = JSON.stringify(resultParse, null, 4);
  //return singStringify
}

async function handleRequest(request) {
  // Define your API Key and other constants at the start
  const API_KEY = 'YOUR_API_KEY_HERE'; // Set your Telegram bot API key here
  const welcomePhoto = "https://user-images.githubusercontent.com/101973571/243159445-957eba3e-bc2f-4d8d-ac36-b45bc56680e7.png";
  const welcomeCaption = "Example";

  if (request.method === "POST") {
    const payload = await request.json();

    if ('message' in payload) {
      const chatId = payload.message.chat.id;
      const inputUrl = payload.message.text;

      try {
        if (inputUrl === "/start") {
          // Sending welcome message
          const textWelcome = "Send the v2ray config link here. If you are sure the config link is correct but you haven't received the config json, pm me [@iya_rivvikyn](https://t.me/iya_rivvikyn)";
          const urlWelcome = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${textWelcome}&parse_mode=markdown`;
          await fetch(urlWelcome);

          const urlPhotoWelcome = `https://api.telegram.org/bot${API_KEY}/sendPhoto?chat_id=${chatId}&photo=${welcomePhoto}&caption=${welcomeCaption}`;
          await fetch(urlPhotoWelcome);
        } else {
          // Main processing of V2Ray configuration
          let inputData = inputUrl.startsWith("http") ? await fetchUrlAllOrigin(inputUrl) : inputUrl;
          let cleanData = await processData(inputData);
          let parseConfig = await v2rayToSing(cleanData);

          // Additional processing
          const outboundsConfig = parseConfig.map((item) => ({ ...item, domain_strategy: "ipv4_only" }));
          let tagCount = {};
          let nameProxy = outboundsConfig.map((item) => {
            let tag = item.tag;
            if (tag in tagCount) {
              tagCount[tag]++;
              return tag + ' ' + tagCount[tag];
            } else {
              tagCount[tag] = 1;
              return tag;
            }
          });
          outboundsConfig.forEach((item, index) => {
            item.tag = nameProxy[index];
          });

          // Fetching additional configuration
          const urls = {
            sfa: "https://raw.githubusercontent.com/iyarivky/sing-ribet/main/config/config.json",
            sfaSimple: "https://raw.githubusercontent.com/iyarivky/sing-ribet/main/config/config-simple.json",
            bfm: "https://raw.githubusercontent.com/iyarivky/sing-ribet/main/config/config-bfm.json",
            bfmSimple: "https://raw.githubusercontent.com/iyarivky/sing-ribet/main/config/config-bfm-simple.json",
            nekobox: "https://raw.githubusercontent.com/iyarivky/sing-ribet/main/config/config-nekobox.json"
          };

          const configs = {};
          for (const [key, url] of Object.entries(urls)) {
            configs[key] = await fetchConfig(url);
          }

          // Configuration names and tags
          const configNames = ["sfa", "sfaSimple", "bfm", "bfmSimple", "nekobox"];
          const tags = {
            sfa: ["Internet", "Best Latency", "Lock Region ID"],
            sfaSimple: ["Internet", "Best Latency"],
            bfm: ["Internet", "Best Latency", "Lock Region ID"],
            bfmSimple: ["Internet", "Best Latency"],
            nekobox: ["Internet", "Best Latency"]
          };

          const findIndexTag = {
            sfa: "Lock Region ID",
            sfaSimple: "Best Latency",
            bfm: "Lock Region ID",
            bfmSimple: "Best Latency",
            nekobox: "Best Latency"
          };

          // Update configurations with proxies
          for (const name of configNames) {
            const config = configs[name];
            config.outbounds.forEach((outbound) => {
              if (tags[name].includes(outbound.tag)) {
                outbound.outbounds.push(...nameProxy);
              }
            });

            let addProxyIndex = config.outbounds.findIndex(outbound => outbound.tag === findIndexTag[name]);
            config.outbounds.splice(addProxyIndex + 1, 0, ...outboundsConfig);

            // Handle DNS rules
            const servers = config.outbounds.map(outbound => outbound.server).filter(Boolean).filter(filterServer => !ipChecker(filterServer));
            const directDnsRule = config.dns.rules.find(rule => rule.server === "direct-dns");
            if (directDnsRule) {
              directDnsRule.domain_suffix = servers;
            }
            if (servers.length === 0) {
              config.dns.rules = config.dns.rules.filter(rule => rule.server !== "direct-dns");
            }
          }

          // Send the final configuration files
          for (const name of configNames) {
            const formattedConfig = JSON.stringify(configs[name], null, 2);
            const blob = new Blob([formattedConfig], { type: 'application/json' });

            let date = new Date();
            let dateString = date.toLocaleDateString('id-ID').replace(/\//g, '-');
            let timeString = date.toLocaleTimeString('id-ID');
            let fileName = `${name}-${dateString}-${timeString}.json`;

            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('document', blob, fileName);
            
            const urlSendDocument = `https://api.telegram.org/bot${API_KEY}/sendDocument`;
            await fetch(urlSendDocument, {
              method: 'POST',
              body: formData
            });
          }
        }
      } catch (error) {
        // Error handling
        const parseMode = "markdown";
        console.log('Error:', error.message);

        const errorMessage = `Error: ${error.message}`;
        const errorUrl = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${errorMessage}&parse_mode=${parseMode}`;
        await fetch(errorUrl);

        const output = "If you are sure the config link is correct but you haven't received the config json, pm me [@iya_rivvikyn](https://t.me/iya_rivvikyn)";
        const userResponseUrl = `https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=${chatId}&text=${output}&parse_mode=${parseMode}`;
        await fetch(userResponseUrl);

        const errorPhotoUrl = `https://api.telegram.org/bot${API_KEY}/sendPhoto?chat_id=${chatId}&photo=${welcomePhoto}&caption=${welcomeCaption}`;
        await fetch(errorPhotoUrl);
      }
    }
  }
  return new Response("OK"); // Return OK response
}

