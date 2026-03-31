
---
# Slangyy – AI Text Rewriter
## Style‑Adaptive Text Rewriting

Slangyy is a Chrome extension that rewrites any text you select in **four distinct styles**: professional, slangy, human (natural), and grammar‑checked. It works like Google Translate: select text, click the floating button, choose a style, and get an instant rewrite with a copy button.

The extension connects to a free API powered by a fine‑tuned Phi‑3‑mini model, hosted on Hugging Face Spaces.

A fine‑tuned language model that rewrites input text in four distinct styles: **professional**, **slangy**, **human** (natural/conversational), and **grammar‑checked**. The model is deployed as a free API on Hugging Face Spaces and is ready to be integrated into a Chrome extension (the extension code is not part of this repository).


---

## ✨ Features

- **Text selection detection** – works on any web page, including input fields.
- **Floating UI** – appears near the selected text; can be dismissed with a click.
- **Four rewriting styles**:
  - **Professional** – formal, business‑appropriate.
  - **Slangy** – casual, youthful, street‑style.
  - **Human** – natural, conversational tone.
  - **Grammar** – fixes grammatical errors while preserving meaning.
- **Copy button** – instantly copy the rewritten text to your clipboard.
- **Lightweight** – no external dependencies, runs entirely in your browser.

---

## 📦 Installation

1. **Download the extension**  
   Clone or download the extension folder from [GitHub / your source].

2. **Load into Chrome**  
   - Open Chrome and go to `chrome://extensions/`.
   - Enable **Developer mode** (toggle in the top‑right corner).
   - Click **Load unpacked**.
   - Select the folder containing the extension files (the one with `manifest.json`).

3. **Verify**  
   The extension icon should appear in your toolbar. Click it to see a status indicator (optional popup).

---

## 🚀 How to Use

1. **Select any text** on a webpage.
2. A small floating button will appear near the bottom‑right of your selection.
3. **Click the button** – the panel expands with a style dropdown and a “Rewrite” button.
4. **Choose a style** and click **Rewrite**.
5. After a few seconds (depending on network speed), the rewritten text appears in the panel.
6. **Click Copy** to save the result to your clipboard, then paste it anywhere.
7. Click the **×** button or click outside the panel to close it.

---

## ⚙️ How It Works

- **Content script** (`content.js`) detects text selection and injects a temporary UI.
- **Background service worker** (`background.js`) securely calls the external API.
- **API endpoint**: `https://viv2005ek-text-rewriter-api-slangy.hf.space/run/predict`
- **Data flow**:  
  Selected text + style → background → API → rewritten text → content script → displayed in the UI.

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Floating button doesn’t appear | Ensure you’ve selected plain text (not an image or link). Try refreshing the page and selecting again. |
| “Rewrite” button does nothing / error appears | Check your internet connection. The API might be temporarily slow – wait a few seconds and retry. |
| API returns an error | The Hugging Face Space may be cold (first request after inactivity). Wait 10–15 seconds and try again. |
| The panel covers the text | The panel is positioned automatically. If it’s misplaced, close it and select the text again. |
| Extension not working after update | Reload the extension on `chrome://extensions/` (click the refresh icon on the card). |

---

## 🔒 Privacy

- The extension does **not** store any user data.
- All text sent to the API is processed in real time and not persisted.
- The API is hosted on Hugging Face’s free CPU tier – your text is used only for the rewrite and then discarded.

---


## Project Overview

- **Base model**: `microsoft/Phi-3-mini-4k-instruct` (3.8B parameters) – chosen for its strong instruction‑following ability and modest size that fits free Colab GPUs.
- **Fine‑tuning method**: QLoRA (4‑bit quantisation + LoRA) using Unsloth for memory efficiency and speed.
- **Dataset**: 2000+ synthetic instruction‑input‑output examples generated via GPT/Gemini, covering all four styles.
- **Deployment**: Hugging Face Spaces (free CPU tier) serving the adapter‑based model for acceptable latency.

---

## 1. Dataset Creation

We generated a synthetic dataset of over 2000 examples, evenly split across the four rewriting styles. Each example follows the structure:

```json
{
  "instruction": "Rewrite the following text in a professional style.",
  "input": "Hey, can u send that report by EOD? thx!",
  "output": "Please send the report by the end of the day. Thank you."
}
```

The dataset is hosted on Hugging Face Hub:  
👉 [viv2005ek/TextRewriterInTonesAndGrammer](https://huggingface.co/datasets/viv2005ek/TextRewriterInTonesAndGrammer)

**Push method**: Used **git xet** (a large‑file versioning tool) to push the JSON file to the Hugging Face dataset repository. This allowed efficient handling of the dataset file without LFS overhead.

---

## 2. Fine‑tuning (QLoRA) on Google Colab

We fine‑tuned `microsoft/Phi-3-mini-4k-instruct` using **Unsloth** – a library that accelerates training and reduces VRAM usage. Key parameters:

- **Quantisation**: 4‑bit (`load_in_4bit=True`)
- **LoRA rank**: `r=16`
- **Target modules**: `q_proj`, `k_proj`, `v_proj`, `o_proj`
- **Batch size**: 2 (gradient accumulation steps = 4)
- **Epochs**: 3
- **Learning rate**: `2e-4`

The training ran on a free T4 GPU in Colab. The final checkpoint (`checkpoint-3`) contains the LoRA adapter weights.

📓 **Colab notebook**: [Open in Colab](https://colab.research.google.com/drive/1aY1tDCQhw3PISREb4c7TQcRKiCA8mdJW?usp=sharing)

---

## 3. Model Adapter (LoRA only)

After fine‑tuning, we pushed the lightweight LoRA adapter (≈50 MB) to the Hub. This adapter must be loaded on top of the original base model to perform inference.

🔗 **Adapter repository**: [viv2005ek/phi-rewriter-adapter](https://huggingface.co/viv2005ek/phi-rewriter-adapter)

---

## 4. Merged Model (Base + Adapter)

For potential deployment speed, we merged the adapter with the base model using `merge_and_unload()` from PEFT. The resulting full‑weight model (≈7.6 GB) is stored separately.

🔗 **Merged model repository**: [viv2005ek/phi-rewriter](https://huggingface.co/viv2005ek/phi-rewriter)

> [!NOTE]
> While the merged model eliminates the adapter overhead, on the free CPU tier of Hugging Face Spaces it actually introduced higher latency. Therefore, the deployed Space uses the adapter‑based model (base + adapter) which performed better under CPU constraints.

---

## 5. Deployment – Hugging Face Space

We built a Gradio Space that:
1. Loads the base model (`microsoft/Phi-3-mini-4k-instruct`) in 4‑bit mode.
2. Loads the LoRA adapter from `viv2005ek/phi-rewriter-adapter`.
3. Exposes a simple `rewrite(text, style)` function with **post‑processing** to keep only the first coherent rewrite (removing extra alternative outputs or conversational fragments).
4. Provides a web UI and a REST API endpoint.

The Space runs on Hugging Face’s free CPU tier (2 vCPU, 16 GB RAM). Response times are typically 5–15 seconds – acceptable for a personal tool or a Chrome extension with a loading spinner.

🔗 **Live Space**: [viv2005ek/text-rewriter-api-SLANGY](https://huggingface.co/spaces/viv2005ek/text-rewriter-api-SLANGY)

---

## 6. Future Improvements

- **Upgrade to a GPU Space**: Would reduce latency to 1–2 seconds (e.g., T4 small at ~$0.40/hour).
- **Quantise the merged model**: Quantise to 4‑bit and deploy it for slightly better CPU performance.
- **Extend dataset**: Include more diverse domains (emails, social media, technical writing).

---

## 7. Repository Structure

```text
.
├── dataset/                     # Synthetic JSON dataset (pushed to Hub)
├── fine_tuning/                 # Colab notebook (linked above)
├── deployment/                  # Space’s app.py & requirements.txt
└── README.md                    # This file
```

---

## License

The fine‑tuned model and adapter are released under the same license as the base model (**Microsoft’s Phi‑3 licence**). The dataset is shared under **CC‑BY‑NC 4.0**.
