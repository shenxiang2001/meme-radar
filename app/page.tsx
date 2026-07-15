"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type IndexRow = { id: number; f: string; d: string };
type Tags = { subjects: string[]; emotions: string[]; intents: string[]; scenes: string[] };

const remoteBase = "https://huggingface.co/datasets/YZhao09/meme_chn/resolve/main/emo/";
const pageSize = 24;

const reviewed: Record<string, Tags & { title: string; local: string }> = {
  "000317dc-9047-4d68-bb55-e40c09ed0f9a.jpg": { title: "孤立他", subjects: ["水豚"], emotions: ["不满"], intents: ["排斥", "吐槽"], scenes: ["群聊"], local: "/memes/000317dc-9047-4d68-bb55-e40c09ed0f9a.jpg" },
  "0005fce3-aefd-4694-bb94-55fbe56d0793.jpg": { title: "每日一练", subjects: ["书本", "文字题"], emotions: ["无语"], intents: ["质疑", "吐槽"], scenes: ["学习"], local: "/memes/0005fce3-aefd-4694-bb94-55fbe56d0793.jpg" },
  "000ba939-ccf5-4071-af24-09c1d8829b0d.jpg": { title: "中中中", subjects: ["熊猫头"], emotions: ["得意"], intents: ["赞同", "确认"], scenes: ["聊天"], local: "/memes/000ba939-ccf5-4071-af24-09c1d8829b0d.jpg" },
  "0017383c-4a6d-4f1f-8aa4-8b19aa6c2283.jpg": { title: "你不要再说了", subjects: ["狗", "手"], emotions: ["无奈"], intents: ["制止", "拒绝"], scenes: ["朋友聊天"], local: "/memes/0017383c-4a6d-4f1f-8aa4-8b19aa6c2283.jpg" },
  "00186ba7-e40b-427f-a96f-d9d7cb645c7c.jpg": { title: "只剩善心", subjects: ["狗", "吉娃娃"], emotions: ["嫌弃"], intents: ["损人", "吐槽"], scenes: ["朋友互损"], local: "/memes/00186ba7-e40b-427f-a96f-d9d7cb645c7c.jpg" },
  "001d34a7-a89e-415d-9e66-da11429c0434.jpg": { title: "准备恰饭", subjects: ["卡通熊", "刀叉"], emotions: ["期待"], intents: ["宣布吃饭"], scenes: ["饭点"], local: "/memes/001d34a7-a89e-415d-9e66-da11429c0434.jpg" },
  "001dc05d-afac-4892-a793-d089e8058ee5.jpg": { title: "原神启动", subjects: ["熊猫头", "电脑"], emotions: ["兴奋"], intents: ["宣布开玩"], scenes: ["游戏"], local: "/memes/001dc05d-afac-4892-a793-d089e8058ee5.jpg" },
  "0029dc2a-bda9-4466-ab60-1b9df8384fe5.jpg": { title: "V我50", subjects: ["猫", "佛祖帽"], emotions: ["搞怪"], intents: ["要钱", "求转账"], scenes: ["朋友聊天"], local: "/memes/0029dc2a-bda9-4466-ab60-1b9df8384fe5.jpg" },
};

const taxonomy = {
  subjects: ["狗", "猫", "熊猫", "熊", "水豚", "兔", "鼠", "人", "小孩", "老人", "书", "电脑", "手机", "刀叉"],
  emotions: ["开心", "兴奋", "得意", "满意", "无语", "疑惑", "震惊", "害怕", "委屈", "难过", "愤怒", "嫌弃", "不满", "期待"],
  intents: ["拒绝", "制止", "赞同", "确认", "吐槽", "质疑", "嘲讽", "安慰", "催促", "求助", "要钱", "转账", "吃饭", "炫耀", "道歉"],
  scenes: ["群聊", "朋友", "恋爱", "学习", "学校", "考试", "游戏", "工作", "职场", "吃饭", "日常"],
};

const aliases: Record<string, string[]> = {
  狗: ["狗", "小狗", "吉娃娃", "犬"], 猫: ["猫", "猫咪"], 熊: ["熊", "熊猫", "熊猫头"],
  吃饭: ["吃饭", "恰饭", "饭点", "美食"], 拒绝: ["拒绝", "制止", "反对", "不要再说"],
  无语: ["无语", "荒谬", "疑惑", "离谱"], 开心: ["开心", "兴奋", "满意", "得意"],
  游戏: ["游戏", "原神", "开黑", "电脑"], 要钱: ["要钱", "转账", "v我50"],
  闭嘴: ["闭嘴", "别说了", "不要再说", "制止"], 学习: ["学习", "学校", "考试", "逻辑题", "书本"],
};

const suggestions = ["狗", "想礼貌地拒绝", "表示无语", "准备吃饭", "游戏开黑", "催朋友回消息"];

function deriveTags(description: string): Tags {
  const pick = (items: string[]) => items.filter(item => description.includes(item)).slice(0, 3);
  return { subjects: pick(taxonomy.subjects), emotions: pick(taxonomy.emotions), intents: pick(taxonomy.intents), scenes: pick(taxonomy.scenes) };
}

function tokensFor(query: string) {
  const q = query.toLowerCase().trim();
  return Array.from(new Set([q, ...Object.entries(aliases).flatMap(([key, values]) => q.includes(key) ? values : [])].filter(Boolean)));
}

function titleFrom(row: IndexRow) {
  const match = row.d.match(/[“「\"]([^”」\"]{2,18})[”」\"]/);
  return match?.[1] || row.d.replace(/^这个表情包(中|的内容)?(展示了|显示了|是)?/, "").slice(0, 14).replace(/[，。：“”]/g, "") || `表情包 ${row.id}`;
}

function scoreRow(row: IndexRow, query: string, tags: Tags) {
  if (!query) return reviewed[row.f] ? 10000 - row.id : 5000 - row.id;
  const tokens = tokensFor(query);
  const text = [row.d, ...tags.subjects, ...tags.emotions, ...tags.intents, ...tags.scenes].join(" ").toLowerCase();
  return tokens.reduce((score, token) => score + (text.includes(token) ? (token === query.toLowerCase() ? 50 : 18) : 0), reviewed[row.f] ? 10 : 0);
}

export default function Home() {
  const [rows, setRows] = useState<IndexRow[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [sort, setSort] = useState<"match" | "reviewed">("match");
  const [visible, setVisible] = useState(pageSize);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/meme-index.json")
      .then(response => { if (!response.ok) throw new Error("index"); return response.json(); })
      .then((data: IndexRow[]) => { setRows(data); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  const results = useMemo(() => {
    const scored = rows.map(row => {
      const tags = reviewed[row.f] || deriveTags(row.d);
      return { row, tags, score: scoreRow(row, activeQuery, tags), reviewed: Boolean(reviewed[row.f]) };
    });
    const matched = activeQuery ? scored.filter(item => item.score > 0) : scored;
    return matched.sort((a, b) => sort === "reviewed" ? Number(b.reviewed) - Number(a.reviewed) || b.score - a.score : b.score - a.score);
  }, [rows, activeQuery, sort]);

  function search(value = query) { setQuery(value); setActiveQuery(value.trim()); setVisible(pageSize); }

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => search("")}><span>梗</span> 热梗雷达</button>
        <nav><button className="nav-active">搜索</button><button>发现</button><button>收藏</button></nav>
        <div className="library-state"><i /> 远程图库已连接</div>
      </header>

      <section className="hero">
        <div className="eyebrow"><i /> {status === "ready" ? `${rows.length.toLocaleString()} 条元数据已索引 · 图片按需加载` : "正在连接远程图库"}</div>
        <h1>想说什么，<br /><em>搜一句</em>就行</h1>
        <p>按画面、情绪、意图和使用场景找表情包。图库不落地保存，搜索命中后再实时加载图片。</p>
        <form className="search" onSubmit={event => { event.preventDefault(); search(); }}>
          <span>⌕</span><input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="比如：想用狗图表示无语" aria-label="描述你想找的表情包" />
          <button>搜一下</button>
        </form>
        <div className="suggestions"><b>试试这些</b>{suggestions.map(item => <button key={item} onClick={() => search(item)}>{item}</button>)}</div>
        <div className="pipeline"><span><b>{rows.length || "—"}</b> 元数据索引</span><span><b>8</b> 视觉已复核</span><span><b>0</b> 全量图片落地</span></div>
      </section>

      <section className="results">
        <div className="result-head"><div><h2>{activeQuery ? `“${activeQuery}” 的结果` : "中文表情包库"}</h2><p>{status === "ready" ? `找到 ${results.length.toLocaleString()} 张 · 图片仅在进入视野时加载` : "正在读取搜索索引…"}</p></div>
          <div className="sort"><button className={sort === "match" ? "selected" : ""} onClick={() => setSort("match")}>最匹配</button><button className={sort === "reviewed" ? "selected" : ""} onClick={() => setSort("reviewed")}>视觉已复核</button></div>
        </div>

        {status === "error" && <div className="empty"><b>索引加载失败</b><span>请刷新页面后重试。</span></div>}
        {status === "loading" && <div className="loading-grid">{Array.from({ length: 8 }).map((_, i) => <i key={i} />)}</div>}
        {status === "ready" && results.length === 0 && <div className="empty"><b>暂时没搜到</b><span>换一种说法，或者先搜主体，例如“狗”“猫”“熊猫”。</span></div>}

        <div className="grid">
          {results.slice(0, visible).map(({ row, tags, reviewed: isReviewed }, index) => {
            const curated = reviewed[row.f];
            const image = curated?.local || `${remoteBase}${encodeURIComponent(row.f)}?download=true`;
            return <article className="card" key={row.id}>
              <div className="meme remote-meme"><img src={image} alt={curated?.title || titleFrom(row)} loading="lazy" /><span className="rank">#{index + 1}</span><span className={isReviewed ? "verified" : "derived"}>{isReviewed ? "视觉已复核" : "描述标签"}</span></div>
              <div className="card-body"><div className="card-title"><h3>{curated?.title || titleFrom(row)}</h3><button aria-label="收藏">♡</button></div>
                <div className="tags">
                  {tags.subjects.slice(0, 1).map(tag => <span key={`s-${tag}`}>主体 · {tag}</span>)}
                  {tags.intents.slice(0, 1).map(tag => <span key={`i-${tag}`}>意图 · {tag}</span>)}
                  {tags.emotions.slice(0, 1).map(tag => <span key={`e-${tag}`}>情绪 · {tag}</span>)}
                  {!tags.subjects.length && !tags.intents.length && !tags.emotions.length && <span>等待按需丰富</span>}
                </div>
                <p className="description">{row.d}</p>
                <div className="meta"><span>{isReviewed ? "人工视觉抽检" : "图库描述生成"}</span><span>远程加载</span></div>
              </div>
            </article>;
          })}
        </div>
        {visible < results.length && <button className="load-more" onClick={() => setVisible(value => value + pageSize)}>再看 {Math.min(pageSize, results.length - visible)} 张</button>}
      </section>
      <button className="floating" onClick={() => inputRef.current?.focus()}>⌕</button>
    </main>
  );
}
