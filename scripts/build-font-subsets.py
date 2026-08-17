"""
<lang xml:lang="zh-CN">为 BP 从固定 Adobe 上游输入生成三份可审计 WOFF 字体子集，并验证字形覆盖、OFL 保留名改写与确定性 provenance。</lang>
<lang xml:lang="en">Builds three auditable WOFF subsets for the BP from pinned Adobe upstream inputs and verifies glyph coverage, OFL reserved-name replacement, and deterministic provenance.</lang>

<lang xml:lang="zh-CN">默认模式仅在缓存缺失时访问固定 HTTPS URL；`--offline` 禁止网络，`--verify-only` 只审计已提交产物。脚本不扫描用户目录、不读取凭据，也不把维护依赖带入 runtime。</lang>
<lang xml:lang="en">Default mode accesses fixed HTTPS URLs only for cache misses; `--offline` forbids network and `--verify-only` audits checked-in artifacts only. The script scans no user directory, reads no credentials, and introduces no maintenance dependency into runtime.</lang>
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import sys
import urllib.request
import zlib
from pathlib import Path
from typing import Any

import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont


# <lang xml:lang="zh-CN">维护工具链必须与 `.mise.toml` 和锁定 wheel 一致；不同解释器或 FontTools 版本可能改变压缩字节或表序。</lang>
# <lang xml:lang="en">The maintenance toolchain must match `.mise.toml` and the pinned wheel; another interpreter or FontTools version may change compressed bytes or table order.</lang>
EXPECTED_PYTHON_VERSION = (3, 12, 13)
EXPECTED_FONTTOOLS_VERSION = "4.63.0"

# <lang xml:lang="zh-CN">从脚本自身位置确定 BP 根，防止调用者 cwd 改变读写边界。</lang>
# <lang xml:lang="en">Resolve the BP root from the script location so the caller's cwd cannot alter read/write boundaries.</lang>
PROJECT_ROOT = Path(__file__).resolve().parent.parent
FONT_DEV_ROOT = PROJECT_ROOT / "dev" / "fonts"
CORPUS_ROOT = FONT_DEV_ROOT / "glyph-corpus"
UPSTREAM_CACHE_ROOT = FONT_DEV_ROOT / ".cache" / "upstream"
OUTPUT_ROOT = PROJECT_ROOT / "src" / "assets" / "fonts"
MANIFEST_PATH = OUTPUT_ROOT / "font-subsets.manifest.json"

# <lang xml:lang="zh-CN">这些 `name` ID 会向用户或字体选择器暴露字体身份，必须全部脱离 OFL 保留名 `Source`。</lang>
# <lang xml:lang="en">These `name` IDs expose font identity to users or font selectors and must all move away from the OFL reserved name `Source`.</lang>
PRIMARY_NAME_IDS = frozenset({1, 2, 3, 4, 6, 16, 17, 21, 22})

# <lang xml:lang="zh-CN">所有输入均锁定仓库、tag、完整 commit、仓内路径、Git blob、字节数与实测 SHA-256；哈希不符时绝不继续生成。</lang>
# <lang xml:lang="en">Every input pins repository, tag, full commit, in-repository path, Git blob, byte count, and observed SHA-256; generation never continues after a hash mismatch.</lang>
FONT_SPECS: tuple[dict[str, Any], ...] = (
    {
        "id": "sans-regular",
        "role": "body",
        "family": "HIA-uView BP Sans SC",
        "style": "Regular",
        "weight": 400,
        "postscriptName": "HIAuViewBPSansSC-Regular",
        "outputFile": "hia-uv-bp-sans-sc-regular-v2.005-subset.woff",
        "maxOutputBytes": 180_000,
        "corpusFile": "sans-runtime.txt",
        "upstream": {
            "repository": "https://github.com/adobe-fonts/source-han-sans",
            "tag": "2.005R",
            "commit": "6c709ca72d3d7c46ab42ebecc1a26e7d69595a37",
            "path": "SubsetOTF/CN/SourceHanSansCN-Regular.otf",
            "blobOid": "5e6605995d5cbc432c4273f566a5f2b8c376c682",
            "bytes": 8_429_224,
            "sha256": "e2bc8a2e7f37474b774fff8db758681ece40bb6947a90d571bce9dd60671a8e4",
            "url": "https://raw.githubusercontent.com/adobe-fonts/source-han-sans/2.005R/SubsetOTF/CN/SourceHanSansCN-Regular.otf",
        },
        "license": {
            "spdx": "OFL-1.1",
            "path": "LICENSES/Source-Han-Sans-OFL-1.1.txt",
            "url": "https://github.com/adobe-fonts/source-han-sans/blob/2.005R/LICENSE.txt",
            "copyright": "Copyright 2014-2025 Adobe",
            "reservedFontName": "Source",
        },
    },
    {
        "id": "sans-bold",
        "role": "emphasis",
        "family": "HIA-uView BP Sans SC",
        "style": "Bold",
        "weight": 700,
        "postscriptName": "HIAuViewBPSansSC-Bold",
        "outputFile": "hia-uv-bp-sans-sc-bold-v2.005-subset.woff",
        "maxOutputBytes": 180_000,
        "corpusFile": "sans-runtime.txt",
        "upstream": {
            "repository": "https://github.com/adobe-fonts/source-han-sans",
            "tag": "2.005R",
            "commit": "6c709ca72d3d7c46ab42ebecc1a26e7d69595a37",
            "path": "SubsetOTF/CN/SourceHanSansCN-Bold.otf",
            "blobOid": "49a623f360e4dfca8e96df4e0681150d76dcaf89",
            "bytes": 8_569_308,
            "sha256": "62383707c086a32f3afd5e293f34c7eff64c7fea31f579fdc6cbe34d920519a6",
            "url": "https://raw.githubusercontent.com/adobe-fonts/source-han-sans/2.005R/SubsetOTF/CN/SourceHanSansCN-Bold.otf",
        },
        "license": {
            "spdx": "OFL-1.1",
            "path": "LICENSES/Source-Han-Sans-OFL-1.1.txt",
            "url": "https://github.com/adobe-fonts/source-han-sans/blob/2.005R/LICENSE.txt",
            "copyright": "Copyright 2014-2025 Adobe",
            "reservedFontName": "Source",
        },
    },
    {
        "id": "serif-bold",
        "role": "display",
        "family": "HIA-uView BP Serif SC",
        "style": "Bold",
        "weight": 700,
        "postscriptName": "HIAuViewBPSerifSC-Bold",
        "outputFile": "hia-uv-bp-serif-sc-bold-v2.003-subset.woff",
        "maxOutputBytes": 200_000,
        "corpusFile": "serif-display.txt",
        "upstream": {
            "repository": "https://github.com/adobe-fonts/source-han-serif",
            "tag": "2.003R",
            "commit": "7889f11bf31170b5d092a083b357c8c8130f89e0",
            "path": "SubsetOTF/CN/SourceHanSerifCN-Bold.otf",
            "blobOid": "f8528fae3e7790e4e9a7660841590181826be5a1",
            "bytes": 12_094_680,
            "sha256": "4ee555ae58b3d22f6a95c2c494f2c36b7cccfc1d2224635f6461a03756f0e3c1",
            "url": "https://raw.githubusercontent.com/adobe-fonts/source-han-serif/2.003R/SubsetOTF/CN/SourceHanSerifCN-Bold.otf",
        },
        "license": {
            "spdx": "OFL-1.1",
            "path": "LICENSES/Source-Han-Serif-OFL-1.1.txt",
            "url": "https://github.com/adobe-fonts/source-han-serif/blob/2.003R/LICENSE.txt",
            "copyright": "Copyright 2017-2022 Adobe",
            "reservedFontName": "Source",
        },
    },
)


def sha256_file(file_path: Path) -> str:
    """
    <lang xml:lang="zh-CN">以固定大小分块计算文件 SHA-256，避免把多兆字节上游字体一次读入额外内存。</lang>
    <lang xml:lang="en">Computes a file SHA-256 in fixed-size chunks so multi-megabyte upstream fonts do not require an extra full-memory copy.</lang>
    """
    # <lang xml:lang="zh-CN">哈希对象只在当前调用内累计公开字体字节，不包含路径、凭据或用户数据。</lang>
    # <lang xml:lang="en">The digest object accumulates public font bytes only for this call and contains no path, credential, or user data.</lang>
    digest = hashlib.sha256()

    # <lang xml:lang="zh-CN">以只读二进制方式读取固定文件，并用 1 MiB 块平衡内存与 I/O 调用次数。</lang>
    # <lang xml:lang="en">Read the fixed file as binary and use 1 MiB chunks to balance memory and I/O call count.</lang>
    with file_path.open("rb") as source_stream:
        while chunk := source_stream.read(1024 * 1024):
            digest.update(chunk)

    # <lang xml:lang="zh-CN">返回小写十六进制，和 manifest、PyPI 与 GitHub 审计字段保持单一形式。</lang>
    # <lang xml:lang="en">Return lowercase hexadecimal to keep one representation across manifest, PyPI, and GitHub audit fields.</lang>
    return digest.hexdigest()


def verify_toolchain() -> None:
    """
    <lang xml:lang="zh-CN">在任何下载或输出写入前验证 Python 与 FontTools 精确版本。</lang>
    <lang xml:lang="en">Verifies the exact Python and FontTools versions before any download or output write.</lang>

    Raises:
        RuntimeError: <lang xml:lang="zh-CN">当前进程未使用项目锁定的维护工具链。</lang><lang xml:lang="en">The current process is not using the project's pinned maintenance toolchain.</lang>
    """
    # <lang xml:lang="zh-CN">只比较 major/minor/patch；解释器构建元数据另行写入 provenance，不参与工具选择。</lang>
    # <lang xml:lang="en">Compare major/minor/patch only; interpreter build metadata is recorded separately in provenance and does not select the tool.</lang>
    current_python = tuple(sys.version_info[:3])
    if current_python != EXPECTED_PYTHON_VERSION:
        raise RuntimeError(f"Expected Python {EXPECTED_PYTHON_VERSION}, received {current_python}.")

    # <lang xml:lang="zh-CN">FontTools 版本必须与经哈希锁定的 wheel 一致，避免生成算法无声明漂移。</lang>
    # <lang xml:lang="en">FontTools must match the hash-pinned wheel so generation algorithms cannot drift without declaration.</lang>
    if fontTools.__version__ != EXPECTED_FONTTOOLS_VERSION:
        raise RuntimeError(f"Expected FontTools {EXPECTED_FONTTOOLS_VERSION}, received {fontTools.__version__}.")


def verify_file_identity(file_path: Path, expected_bytes: int, expected_sha256: str, label: str) -> None:
    """
    <lang xml:lang="zh-CN">以字节数与 SHA-256 双重核验一个固定输入或输出。</lang>
    <lang xml:lang="en">Verifies one fixed input or output by both byte count and SHA-256.</lang>

    Raises:
        RuntimeError: <lang xml:lang="zh-CN">文件缺失、大小漂移或哈希不匹配。</lang><lang xml:lang="en">The file is missing, has a different size, or has a mismatched digest.</lang>
    """
    # <lang xml:lang="zh-CN">先验证存在性和常规文件类型，使后续消息不会把目录或设备误报为字体。</lang>
    # <lang xml:lang="en">Verify existence and regular-file type first so later diagnostics never misreport a directory or device as a font.</lang>
    if not file_path.is_file():
        raise RuntimeError(f"Missing {label}.")

    # <lang xml:lang="zh-CN">大小检查可快速发现 Git LFS pointer、HTML 错误页或截断下载，再进行完整哈希。</lang>
    # <lang xml:lang="en">The size check quickly catches a Git LFS pointer, HTML error page, or truncated download before a full digest.</lang>
    observed_bytes = file_path.stat().st_size
    if observed_bytes != expected_bytes:
        raise RuntimeError(f"Unexpected byte count for {label}: {observed_bytes}.")

    # <lang xml:lang="zh-CN">SHA-256 是最终内容身份；URL、tag 或文件名绝不替代它。</lang>
    # <lang xml:lang="en">SHA-256 is the final content identity; a URL, tag, or filename never substitutes for it.</lang>
    observed_sha256 = sha256_file(file_path)
    if observed_sha256 != expected_sha256:
        raise RuntimeError(f"Unexpected SHA-256 for {label}: {observed_sha256}.")


def obtain_upstream_font(font_spec: dict[str, Any], offline: bool) -> Path:
    """
    <lang xml:lang="zh-CN">从固定缓存取得上游字体；缓存缺失且允许联网时，仅下载声明的 Adobe raw URL。</lang>
    <lang xml:lang="en">Obtains an upstream font from the fixed cache; when absent and online, downloads only the declared Adobe raw URL.</lang>

    Raises:
        RuntimeError: <lang xml:lang="zh-CN">离线缓存缺失、下载失败或内容身份不匹配。</lang><lang xml:lang="en">The offline cache is absent, the download fails, or content identity does not match.</lang>
    """
    # <lang xml:lang="zh-CN">缓存文件名直接取固定上游路径末段，不接受 CLI 或网络响应建议的名称。</lang>
    # <lang xml:lang="en">The cache filename comes directly from the fixed upstream path tail and accepts no CLI or response-suggested name.</lang>
    upstream = font_spec["upstream"]
    cache_path = UPSTREAM_CACHE_ROOT / Path(upstream["path"]).name

    # <lang xml:lang="zh-CN">已有缓存先做完整身份核验；被污染的缓存不会被静默覆盖或继续使用。</lang>
    # <lang xml:lang="en">An existing cache receives full identity verification first; a polluted cache is neither silently overwritten nor used.</lang>
    if cache_path.exists():
        verify_file_identity(cache_path, upstream["bytes"], upstream["sha256"], f"upstream cache for {font_spec['id']}")
        return cache_path

    # <lang xml:lang="zh-CN">离线模式禁止任何请求，并明确提示先执行一次受审计的在线 intake。</lang>
    # <lang xml:lang="en">Offline mode forbids every request and explicitly requires a prior audited online intake.</lang>
    if offline:
        raise RuntimeError(f"Missing offline upstream cache for {font_spec['id']}.")

    # <lang xml:lang="zh-CN">只创建仓内已忽略的维护缓存目录；最终发布字体位于独立版本化目录。</lang>
    # <lang xml:lang="en">Create only the ignored in-repository maintenance cache; final distributable fonts live in a separate versioned directory.</lang>
    UPSTREAM_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    temporary_path = cache_path.with_suffix(cache_path.suffix + ".part")

    # <lang xml:lang="zh-CN">固定 User-Agent 只标识公开生成器；请求不发送 Cookie、token、查询参数或机器路径。</lang>
    # <lang xml:lang="en">The fixed User-Agent identifies only the public generator; the request sends no cookie, token, query parameter, or machine path.</lang>
    request = urllib.request.Request(upstream["url"], headers={"User-Agent": "HIA-uView-BP-font-subsetter/1.0"})

    try:
        # <lang xml:lang="zh-CN">响应以有限块写入 `.part`，只有完整哈希通过后才原子提升为缓存。</lang>
        # <lang xml:lang="en">Write the response to `.part` in bounded chunks and promote it atomically only after the complete digest passes.</lang>
        with urllib.request.urlopen(request, timeout=60) as response, temporary_path.open("wb") as target_stream:
            while chunk := response.read(1024 * 1024):
                target_stream.write(chunk)

        verify_file_identity(temporary_path, upstream["bytes"], upstream["sha256"], f"download for {font_spec['id']}")
        os.replace(temporary_path, cache_path)
    finally:
        # <lang xml:lang="zh-CN">失败下载留下的临时文件没有审计价值；只移除固定 `.part`，绝不触碰已验证缓存或其他路径。</lang>
        # <lang xml:lang="en">A failed partial download has no audit value; remove only the fixed `.part` and never touch a verified cache or another path.</lang>
        if temporary_path.exists():
            temporary_path.unlink()

    return cache_path


def read_text_corpus(corpus_path: Path) -> set[int]:
    """
    <lang xml:lang="zh-CN">读取实际字符语料，忽略 `#` 开头说明行并返回 Unicode code point 集合。</lang>
    <lang xml:lang="en">Reads a literal-character corpus, ignores explanatory lines beginning with `#`, and returns Unicode code points.</lang>
    """
    # <lang xml:lang="zh-CN">UTF-8 是 corpus 的唯一编码；每行尾换行不是界面字形，故不加入集合。</lang>
    # <lang xml:lang="en">UTF-8 is the corpus's sole encoding; line-ending characters are not interface glyphs and are excluded.</lang>
    source_lines = corpus_path.read_text(encoding="utf-8").splitlines()
    codepoints: set[int] = set()

    # <lang xml:lang="zh-CN">说明行与空行不贡献字形；其余字符按 code point 去重而不按字形名称猜测。</lang>
    # <lang xml:lang="en">Explanatory and empty lines contribute no glyph; remaining characters are deduplicated by code point without guessing glyph names.</lang>
    for source_line in source_lines:
        if not source_line or source_line.startswith("#"):
            continue
        codepoints.update(ord(character) for character in source_line)

    return codepoints


def read_codepoint_spec(spec_path: Path) -> set[int]:
    """
    <lang xml:lang="zh-CN">解析受控 `U+XXXX` 或 `U+XXXX-U+YYYY` 行，供空格、ASCII 与少量界面符号精确入集。</lang>
    <lang xml:lang="en">Parses controlled `U+XXXX` or `U+XXXX-U+YYYY` lines so spaces, ASCII, and a few interface symbols enter the subset exactly.</lang>
    """
    # <lang xml:lang="zh-CN">code point 集合在当前文件内累加；格式之外的文本立即失败，避免注释内容意外进入字体。</lang>
    # <lang xml:lang="en">The code-point set accumulates within this file; text outside the format fails immediately so comments cannot enter the font accidentally.</lang>
    codepoints: set[int] = set()
    source_lines = spec_path.read_text(encoding="utf-8").splitlines()

    for line_number, source_line in enumerate(source_lines, start=1):
        # <lang xml:lang="zh-CN">去除行边空白后识别空行和双语说明；中间空白不是合法语法。</lang>
        # <lang xml:lang="en">Trim edge whitespace before identifying blank and bilingual explanatory lines; interior whitespace is not valid syntax.</lang>
        token = source_line.strip()
        if not token or token.startswith("#"):
            continue

        # <lang xml:lang="zh-CN">每个边界必须显式使用 `U+` 十六进制，拒绝十进制或隐式字符范围。</lang>
        # <lang xml:lang="en">Every boundary must use explicit hexadecimal `U+` syntax; decimal and implicit character ranges are rejected.</lang>
        boundaries = token.split("-")
        if len(boundaries) not in {1, 2} or any(not boundary.startswith("U+") for boundary in boundaries):
            raise RuntimeError(f"Invalid code-point syntax at {spec_path.name}:{line_number}.")

        # <lang xml:lang="zh-CN">单值范围的起止相同；双值范围必须递增且不超过 Unicode 上界。</lang>
        # <lang xml:lang="en">A singleton has equal start and end; a range must increase and remain within the Unicode ceiling.</lang>
        start = int(boundaries[0][2:], 16)
        end = int(boundaries[-1][2:], 16)
        if start > end or end > 0x10FFFF:
            raise RuntimeError(f"Invalid code-point range at {spec_path.name}:{line_number}.")

        codepoints.update(range(start, end + 1))

    return codepoints


def required_codepoints(font_spec: dict[str, Any]) -> set[int]:
    """
    <lang xml:lang="zh-CN">合并角色专属可见文案与共享 ASCII/符号规范，形成该 face 的有限 Unicode 合同。</lang>
    <lang xml:lang="en">Combines role-specific visible copy with the shared ASCII/symbol specification into the face's finite Unicode contract.</lang>
    """
    # <lang xml:lang="zh-CN">角色语料由版本控制文件给出；它不包含源码注释、自由输入或未来远端数据。</lang>
    # <lang xml:lang="en">A version-controlled file supplies the role corpus; it excludes source comments, free-form input, and future remote data.</lang>
    role_codepoints = read_text_corpus(CORPUS_ROOT / font_spec["corpusFile"])

    # <lang xml:lang="zh-CN">共享符号显式加入每个 face，保证数字、拉丁 fallback 前的本地一致性和当前图标文本符号。</lang>
    # <lang xml:lang="en">Shared symbols enter every face explicitly, preserving local consistency for digits, Latin copy, and current text symbols before fallback.</lang>
    shared_codepoints = read_codepoint_spec(CORPUS_ROOT / "runtime-symbols.txt")
    return role_codepoints | shared_codepoints


def encoded_name_value(existing_value: Any, replacement: str) -> Any:
    """
    <lang xml:lang="zh-CN">保持 CFF 字符串对象原有 `bytes`/`str` 表面，同时替换为纯 ASCII 项目字体名。</lang>
    <lang xml:lang="en">Preserves the CFF string object's existing `bytes`/`str` surface while replacing it with an ASCII-only project font name.</lang>
    """
    # <lang xml:lang="zh-CN">部分 FontTools/CFF 输入将 INDEX 字符串表示为 bytes；ASCII 名可无损适配两种模型。</lang>
    # <lang xml:lang="en">Some FontTools/CFF inputs expose INDEX strings as bytes; an ASCII name adapts losslessly to both models.</lang>
    return replacement.encode("ascii") if isinstance(existing_value, bytes) else replacement


def rename_font_identity(font: TTFont, font_spec: dict[str, Any]) -> dict[int, str]:
    """
    <lang xml:lang="zh-CN">改写 `name` 与 CFF 主身份字段，保留版权、商标、许可及其他上游元数据。</lang>
    <lang xml:lang="en">Rewrites primary identity fields in `name` and CFF while preserving copyright, trademark, license, and other upstream metadata.</lang>

    Returns:
        dict[int, str]: <lang xml:lang="zh-CN">每个受控 name ID 的期望值。</lang><lang xml:lang="en">Expected value for every controlled name ID.</lang>
    """
    # <lang xml:lang="zh-CN">Regular 的完整名不重复 style；其他 face 显式带 style，匹配常见 OpenType 命名。</lang>
    # <lang xml:lang="en">Regular omits a repeated style in the full name while other faces include it, matching common OpenType naming.</lang>
    family = font_spec["family"]
    style = font_spec["style"]
    full_name = family if style == "Regular" else f"{family} {style}"
    unique_name = f"HIA-uView BP;{font_spec['upstream']['tag']};{font_spec['postscriptName']}"
    expected_names = {
        1: family,
        2: style,
        3: unique_name,
        4: full_name,
        6: font_spec["postscriptName"],
        16: family,
        17: style,
        21: family,
        22: style,
    }

    # <lang xml:lang="zh-CN">逐条改写现有跨平台名称记录；ASCII 项目名可安全编码到 Adobe 输入已有的所有 legacy 记录。</lang>
    # <lang xml:lang="en">Rewrite each existing cross-platform name record; ASCII project names encode safely into every legacy record present in the Adobe input.</lang>
    name_table = font["name"]
    for name_record in name_table.names:
        if name_record.nameID in expected_names:
            name_record.string = expected_names[name_record.nameID].encode(name_record.getEncoding())

    # <lang xml:lang="zh-CN">显式补齐 Windows English 与 Macintosh Roman 记录，保证浏览器、微信和审计器都有稳定可读身份。</lang>
    # <lang xml:lang="en">Add explicit Windows English and Macintosh Roman records so browsers, WeChat, and auditors receive a stable readable identity.</lang>
    for name_id, expected_value in expected_names.items():
        name_table.setName(expected_value, name_id, 3, 1, 0x0409)
        name_table.setName(expected_value, name_id, 1, 0, 0)

    # <lang xml:lang="zh-CN">Source Han 的 OTF 使用 CFF；其 FontName/FamilyName/FullName 也属于主身份，不能只改 `name` table。</lang>
    # <lang xml:lang="en">Source Han OTF uses CFF, whose FontName, FamilyName, and FullName are also primary identity and cannot be left behind when changing only the `name` table.</lang>
    cff = font["CFF "].cff
    cff.fontNames[0] = encoded_name_value(cff.fontNames[0], font_spec["postscriptName"])
    top_dict = cff.topDictIndex[0]
    top_dict.FamilyName = encoded_name_value(top_dict.FamilyName, family)
    top_dict.FullName = encoded_name_value(top_dict.FullName, full_name)
    top_dict.Weight = encoded_name_value(top_dict.Weight, style)

    return expected_names


def verify_font_semantics(font_path: Path, font_spec: dict[str, Any], codepoints: set[int]) -> dict[str, int]:
    """
    <lang xml:lang="zh-CN">验证 WOFF 格式、字重、完整字形覆盖以及不含 `Source` 的主身份字段。</lang>
    <lang xml:lang="en">Verifies WOFF format, weight, complete glyph coverage, and primary identity fields free of `Source`.</lang>

    Returns:
        dict[str, int]: <lang xml:lang="zh-CN">用于 provenance 的字形数和 Unicode 映射数。</lang><lang xml:lang="en">Glyph and Unicode mapping counts for provenance.</lang>
    """
    # <lang xml:lang="zh-CN">关闭时间戳重算并完整打开当前产物；检查过程不修改字体。</lang>
    # <lang xml:lang="en">Disable timestamp recalculation and fully open the current artifact; verification does not modify the font.</lang>
    font = TTFont(font_path, recalcTimestamp=False, lazy=False)
    try:
        # <lang xml:lang="zh-CN">文件必须是真正 WOFF 包装的 CFF OpenType，不能只依赖扩展名。</lang>
        # <lang xml:lang="en">The file must be a real WOFF-wrapped CFF OpenType font and cannot rely on its extension.</lang>
        if font.flavor != "woff" or "CFF " not in font:
            raise RuntimeError(f"Unexpected font format for {font_spec['id']}.")

        # <lang xml:lang="zh-CN">OS/2 权重必须与 runtime 声明精确相同，避免浏览器合成错误 face。</lang>
        # <lang xml:lang="en">OS/2 weight must exactly match the runtime declaration so browsers do not synthesize the wrong face.</lang>
        observed_weight = int(font["OS/2"].usWeightClass)
        if observed_weight != font_spec["weight"]:
            raise RuntimeError(f"Unexpected weight for {font_spec['id']}: {observed_weight}.")

        # <lang xml:lang="zh-CN">按同一规则重建期望主名；许可和版权 name ID 不在该改写集合中。</lang>
        # <lang xml:lang="en">Reconstruct expected primary names under the same rule; license and copyright name IDs are outside this replacement set.</lang>
        family = font_spec["family"]
        style = font_spec["style"]
        full_name = family if style == "Regular" else f"{family} {style}"
        expected_names = {
            1: family,
            2: style,
            3: f"HIA-uView BP;{font_spec['upstream']['tag']};{font_spec['postscriptName']}",
            4: full_name,
            6: font_spec["postscriptName"],
            16: family,
            17: style,
            21: family,
            22: style,
        }

        # <lang xml:lang="zh-CN">每个受控 ID 的所有 surviving records 都必须等于项目名，不允许某个平台继续暴露保留名。</lang>
        # <lang xml:lang="en">Every surviving record for each controlled ID must equal the project name; no platform may continue exposing the reserved name.</lang>
        for name_id, expected_value in expected_names.items():
            observed_values = {
                name_record.toUnicode()
                for name_record in font["name"].names
                if name_record.nameID == name_id
            }
            if not observed_values or observed_values != {expected_value}:
                raise RuntimeError(f"Unexpected name ID {name_id} for {font_spec['id']}: {sorted(observed_values)}.")
            if any("source" in observed_value.casefold() for observed_value in observed_values):
                raise RuntimeError(f"Reserved font name remains in name ID {name_id} for {font_spec['id']}.")

        # <lang xml:lang="zh-CN">OFL 许可说明必须继续作为 name ID 13 存在；子集化不能把再分发条件从二进制元数据中删除。</lang>
        # <lang xml:lang="en">The OFL license description must remain as name ID 13; subsetting cannot remove redistribution conditions from binary metadata.</lang>
        license_values = {
            name_record.toUnicode()
            for name_record in font["name"].names
            if name_record.nameID == 13
        }
        if not license_values or not any("Open Font License" in value for value in license_values):
            raise RuntimeError(f"Missing OFL metadata for {font_spec['id']}.")

        # <lang xml:lang="zh-CN">CFF 主身份与 `name` table 必须一致；版权 Notice 可合法保留 Adobe 与 Source 归属。</lang>
        # <lang xml:lang="en">CFF primary identity must match the `name` table; copyright Notice may legitimately preserve Adobe and Source attribution.</lang>
        cff = font["CFF "].cff
        top_dict = cff.topDictIndex[0]
        cff_values = {
            "FontName": cff.fontNames[0],
            "FamilyName": top_dict.FamilyName,
            "FullName": top_dict.FullName,
        }
        normalized_cff_values = {
            key: value.decode("ascii") if isinstance(value, bytes) else str(value)
            for key, value in cff_values.items()
        }
        expected_cff_values = {
            "FontName": font_spec["postscriptName"],
            "FamilyName": family,
            "FullName": full_name,
        }
        if normalized_cff_values != expected_cff_values:
            raise RuntimeError(f"Unexpected CFF identity for {font_spec['id']}: {normalized_cff_values}.")
        if any("source" in value.casefold() for value in normalized_cff_values.values()):
            raise RuntimeError(f"Reserved font name remains in CFF identity for {font_spec['id']}.")

        # <lang xml:lang="zh-CN">best cmap 必须覆盖完整受控语料；自由输入和未来远端数据明确由 fallback 承担。</lang>
        # <lang xml:lang="en">The best cmap must cover the complete controlled corpus; fallback explicitly owns free-form input and future remote data.</lang>
        mapped_codepoints = set(font.getBestCmap().keys())
        missing_codepoints = sorted(codepoints - mapped_codepoints)
        if missing_codepoints:
            formatted_missing = ", ".join(f"U+{codepoint:04X}" for codepoint in missing_codepoints[:20])
            raise RuntimeError(f"Missing glyphs for {font_spec['id']}: {formatted_missing}.")

        return {
            "glyphCount": len(font.getGlyphOrder()),
            "mappedUnicodeCount": len(mapped_codepoints),
        }
    finally:
        # <lang xml:lang="zh-CN">显式关闭字体文件句柄，使 Windows 后续原子替换不受资源占用影响。</lang>
        # <lang xml:lang="en">Close the font handle explicitly so later atomic replacement on Windows is not blocked by resource ownership.</lang>
        font.close()


def build_font(font_spec: dict[str, Any], source_path: Path, codepoints: set[int]) -> dict[str, int]:
    """
    <lang xml:lang="zh-CN">对单个 Adobe OTF 执行有限 Unicode 子集、主身份改写、WOFF 压缩及语义验证。</lang>
    <lang xml:lang="en">Subsets one Adobe OTF to a finite Unicode set, rewrites primary identity, compresses to WOFF, and verifies semantics.</lang>
    """
    # <lang xml:lang="zh-CN">先检查上游 cmap 覆盖，避免 FontTools 的 missing-glyph 容忍行为生成表面成功但不完整的字体。</lang>
    # <lang xml:lang="en">Check upstream cmap coverage first so FontTools missing-glyph tolerance cannot create an apparently successful but incomplete font.</lang>
    source_font = TTFont(source_path, recalcTimestamp=False, lazy=False)
    try:
        available_codepoints = set(source_font.getBestCmap().keys())
        missing_codepoints = sorted(codepoints - available_codepoints)
        if missing_codepoints:
            formatted_missing = ", ".join(f"U+{codepoint:04X}" for codepoint in missing_codepoints[:20])
            raise RuntimeError(f"Upstream lacks required glyphs for {font_spec['id']}: {formatted_missing}.")

        # <lang xml:lang="zh-CN">使用 FontTools 官方 subset API；保留 hinting、布局闭包、`.notdef` 与许可相关 name IDs。</lang>
        # <lang xml:lang="en">Use the official FontTools subset API while retaining hinting, layout closure, `.notdef`, and license-related name IDs.</lang>
        options = subset.Options()
        options.hinting = True
        options.layout_closure = True
        options.notdef_glyph = True
        options.notdef_outline = True
        options.recommended_glyphs = True
        options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 16, 17, 21, 22]
        options.name_legacy = True
        options.name_languages = ["*"]
        options.recalc_timestamp = False
        options.canonical_order = True

        # <lang xml:lang="zh-CN">Unicode 集合已经由受控 corpus 合并，不从源码注释、目录扫描或外部文本自动扩张。</lang>
        # <lang xml:lang="en">The Unicode set already comes from controlled corpora and never expands automatically from source comments, directory scans, or external text.</lang>
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=codepoints)
        subsetter.subset(source_font)

        # <lang xml:lang="zh-CN">子集属于 OFL Modified Version，故在序列化前改写所有主身份；版权与许可字段保持上游事实。</lang>
        # <lang xml:lang="en">A subset is an OFL Modified Version, so every primary identity is rewritten before serialization while copyright and license fields retain upstream facts.</lang>
        rename_font_identity(source_font, font_spec)

        # <lang xml:lang="zh-CN">WOFF 1.0 使用平台普遍可用的 zlib，并避开微信官方提示的旧 iOS WOFF2 兼容风险。</lang>
        # <lang xml:lang="en">WOFF 1.0 uses broadly available zlib and avoids the older-iOS WOFF2 compatibility risk noted by WeChat.</lang>
        source_font.flavor = "woff"
        source_font.recalcTimestamp = False
        OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_ROOT / font_spec["outputFile"]
        temporary_output_path = output_path.with_suffix(output_path.suffix + ".tmp")
        source_font.save(temporary_output_path, reorderTables=False)
    finally:
        source_font.close()

    try:
        # <lang xml:lang="zh-CN">在替换版本化产物前先对临时 WOFF 做完整语义检查和单 face 包体预算检查。</lang>
        # <lang xml:lang="en">Perform complete semantic checks and the per-face byte budget on the temporary WOFF before replacing the versioned artifact.</lang>
        semantic_counts = verify_font_semantics(temporary_output_path, font_spec, codepoints)
        observed_bytes = temporary_output_path.stat().st_size
        if observed_bytes > font_spec["maxOutputBytes"]:
            raise RuntimeError(f"Font budget exceeded for {font_spec['id']}: {observed_bytes} bytes.")

        # <lang xml:lang="zh-CN">只有全部检查通过后才原子替换同名输出，避免失败生成留下半成品。</lang>
        # <lang xml:lang="en">Atomically replace the named output only after every check passes, preventing a failed generation from leaving a partial artifact.</lang>
        os.replace(temporary_output_path, output_path)
        return semantic_counts
    finally:
        # <lang xml:lang="zh-CN">异常路径只清理由本次生成创建的固定 `.tmp` 文件。</lang>
        # <lang xml:lang="en">The exceptional path removes only the fixed `.tmp` created by this generation.</lang>
        if temporary_output_path.exists():
            temporary_output_path.unlink()


def build_manifest(face_results: list[dict[str, Any]]) -> dict[str, Any]:
    """
    <lang xml:lang="zh-CN">构造不含当前时间或机器路径的稳定 provenance manifest。</lang>
    <lang xml:lang="en">Constructs a stable provenance manifest containing neither current time nor machine paths.</lang>
    """
    # <lang xml:lang="zh-CN">许可条目按路径去重；每份文本同时记录内容哈希，防止 notices 与实际二进制许可分叉。</lang>
    # <lang xml:lang="en">Deduplicate license entries by path and record content digests so notices cannot diverge from binary licensing.</lang>
    licenses_by_path: dict[str, dict[str, Any]] = {}
    for font_spec in FONT_SPECS:
        license_record = font_spec["license"]
        license_path = PROJECT_ROOT / license_record["path"]
        licenses_by_path[license_record["path"]] = {
            **license_record,
            "sha256": sha256_file(license_path),
        }

    # <lang xml:lang="zh-CN">脚本自身哈希使 manifest 能识别生成算法变更；它不包含 manifest，故不存在循环哈希。</lang>
    # <lang xml:lang="en">The script's own digest identifies generator changes; it does not include the manifest and therefore creates no hash cycle.</lang>
    script_relative_path = "scripts/build-font-subsets.py"
    script_sha256 = sha256_file(PROJECT_ROOT / script_relative_path)

    return {
        "schemaVersion": "1.0",
        "policy": {
            "scope": "bp-uv-resource-booking deterministic local font subsets",
            "runtimeCorpusLimit": "Reviewed locale/data strings plus explicit shared symbols; free input and future remote data use fallback fonts.",
            "modifiedFontReservedNamePolicy": "Primary name and CFF identities never use the OFL Reserved Font Name Source.",
            "distributionTargets": ["h5", "mp-weixin-devtools"],
            "delivery": {
                "h5": "same-origin versioned WOFF asset",
                "mp-weixin": "project-owned WOFF embedded byte-for-byte as generated CSS data URLs",
            },
            "mpWeixinMinimumBaseLibraryForDataUrl": "3.7.9",
            "validatedMpWeixinBaseLibrary": "3.16.2",
            "productionPackageComplianceClaimed": False,
        },
        "toolchain": {
            "pythonVersion": platform.python_version(),
            "pythonImplementation": platform.python_implementation(),
            "fontToolsVersion": fontTools.__version__,
            "zlibCompileVersion": zlib.ZLIB_VERSION,
            "zlibRuntimeVersion": zlib.ZLIB_RUNTIME_VERSION,
            "scriptPath": script_relative_path,
            "scriptSha256": script_sha256,
            "requirementsPath": "dev/fonts/requirements.lock",
            "requirementsSha256": sha256_file(FONT_DEV_ROOT / "requirements.lock"),
        },
        "licenses": sorted(licenses_by_path.values(), key=lambda license_entry: license_entry["path"]),
        "faces": face_results,
    }


def generate_fonts(offline: bool) -> None:
    """
    <lang xml:lang="zh-CN">按冻结顺序生成全部三张 face，随后一次性写入稳定 manifest。</lang>
    <lang xml:lang="en">Generates all three faces in frozen order and then writes the stable manifest once.</lang>
    """
    # <lang xml:lang="zh-CN">结果列表只保存公开 provenance；缓存绝对路径和网络响应头不会进入版本化文件。</lang>
    # <lang xml:lang="en">The result list stores public provenance only; absolute cache paths and response headers never enter versioned files.</lang>
    face_results: list[dict[str, Any]] = []
    shared_corpus_path = CORPUS_ROOT / "runtime-symbols.txt"

    for font_spec in FONT_SPECS:
        # <lang xml:lang="zh-CN">每张 face 在获取输入前先解析有限 corpus，使缺失或格式错误不会触发无谓网络。</lang>
        # <lang xml:lang="en">Resolve each face's finite corpus before obtaining input so missing or malformed corpus never triggers needless network access.</lang>
        codepoints = required_codepoints(font_spec)
        source_path = obtain_upstream_font(font_spec, offline)
        semantic_counts = build_font(font_spec, source_path, codepoints)
        output_path = OUTPUT_ROOT / font_spec["outputFile"]
        role_corpus_path = CORPUS_ROOT / font_spec["corpusFile"]

        # <lang xml:lang="zh-CN">每项 face provenance 同时绑定上游、语料、输出、改名和许可，不依赖散落文档补全关键事实。</lang>
        # <lang xml:lang="en">Each face provenance binds upstream, corpus, output, renaming, and license together without relying on scattered documentation for critical facts.</lang>
        face_results.append({
            "id": font_spec["id"],
            "role": font_spec["role"],
            "cssFamily": font_spec["family"],
            "fontStyle": "normal",
            "fontWeight": font_spec["weight"],
            "postscriptName": font_spec["postscriptName"],
            "format": "woff",
            "mimeType": "font/woff",
            "outputPath": output_path.relative_to(PROJECT_ROOT).as_posix(),
            "outputBytes": output_path.stat().st_size,
            "outputSha256": sha256_file(output_path),
            "maxOutputBytes": font_spec["maxOutputBytes"],
            "unicodeCount": len(codepoints),
            **semantic_counts,
            "corpus": {
                "rolePath": role_corpus_path.relative_to(PROJECT_ROOT).as_posix(),
                "roleSha256": sha256_file(role_corpus_path),
                "sharedPath": shared_corpus_path.relative_to(PROJECT_ROOT).as_posix(),
                "sharedSha256": sha256_file(shared_corpus_path),
            },
            "upstream": font_spec["upstream"],
            "license": {
                "spdx": font_spec["license"]["spdx"],
                "path": font_spec["license"]["path"],
                "copyright": font_spec["license"]["copyright"],
                "reservedFontName": font_spec["license"]["reservedFontName"],
            },
            "renamedNameIds": sorted(PRIMARY_NAME_IDS),
            "reservedPrimaryNameCheck": True,
            "subsettingOptions": {
                "format": "woff",
                "hinting": True,
                "layoutClosure": True,
                "notdefGlyph": True,
                "notdefOutline": True,
                "recommendedGlyphs": True,
                "canonicalTableOrder": True,
                "timestampRecalculation": False,
            },
        })

    # <lang xml:lang="zh-CN">JSON 使用 UTF-8、排序键和固定缩进；不写时间戳，因此相同输入可得到逐字节相同 manifest。</lang>
    # <lang xml:lang="en">JSON uses UTF-8, sorted keys, and fixed indentation; no timestamp is written, so identical inputs produce a byte-identical manifest.</lang>
    manifest = build_manifest(face_results)
    manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    MANIFEST_PATH.write_text(manifest_text, encoding="utf-8", newline="\n")


def verify_generated_artifacts() -> None:
    """
    <lang xml:lang="zh-CN">依据已提交 manifest 复核输出、语料、工具与二进制语义，全程只读。</lang>
    <lang xml:lang="en">Re-verifies outputs, corpora, tooling, and binary semantics against the checked-in manifest in a read-only pass.</lang>
    """
    # <lang xml:lang="zh-CN">manifest 必须是固定路径的 JSON object；未知 face 或丢失 face 均由精确 ID 集合阻断。</lang>
    # <lang xml:lang="en">The fixed-path manifest must be a JSON object; exact IDs block both unknown and missing faces.</lang>
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest_faces = manifest.get("faces", [])
    faces_by_id = {face_record["id"]: face_record for face_record in manifest_faces}
    expected_ids = {font_spec["id"] for font_spec in FONT_SPECS}
    if set(faces_by_id) != expected_ids:
        raise RuntimeError("Unexpected face IDs in font provenance manifest.")

    # <lang xml:lang="zh-CN">生成器与依赖锁文件哈希必须仍对应 manifest，防止改脚本后继续声称旧产物可复现。</lang>
    # <lang xml:lang="en">Generator and dependency-lock digests must still match the manifest so a changed script cannot keep claiming old artifacts are reproducible.</lang>
    toolchain = manifest["toolchain"]
    if toolchain["scriptSha256"] != sha256_file(PROJECT_ROOT / toolchain["scriptPath"]):
        raise RuntimeError("Font generator hash does not match the manifest.")
    if toolchain["requirementsSha256"] != sha256_file(PROJECT_ROOT / toolchain["requirementsPath"]):
        raise RuntimeError("Font dependency lock hash does not match the manifest.")

    for font_spec in FONT_SPECS:
        # <lang xml:lang="zh-CN">输出路径来自冻结 spec，并必须和 manifest 的仓内 POSIX 路径一致，拒绝 manifest 路径重定向。</lang>
        # <lang xml:lang="en">The output path comes from the frozen spec and must equal the manifest's in-repository POSIX path, rejecting manifest path redirection.</lang>
        face_record = faces_by_id[font_spec["id"]]
        output_path = OUTPUT_ROOT / font_spec["outputFile"]
        expected_relative_path = output_path.relative_to(PROJECT_ROOT).as_posix()
        if face_record["outputPath"] != expected_relative_path:
            raise RuntimeError(f"Unexpected output path for {font_spec['id']}.")

        verify_file_identity(output_path, face_record["outputBytes"], face_record["outputSha256"], f"output for {font_spec['id']}")
        codepoints = required_codepoints(font_spec)
        semantic_counts = verify_font_semantics(output_path, font_spec, codepoints)
        if face_record["unicodeCount"] != len(codepoints) or any(face_record[key] != value for key, value in semantic_counts.items()):
            raise RuntimeError(f"Unexpected corpus or glyph counts for {font_spec['id']}.")

        # <lang xml:lang="zh-CN">角色与共享 corpus 的内容哈希也必须匹配，确保字体覆盖合同没有在未重建时漂移。</lang>
        # <lang xml:lang="en">Role and shared corpus content digests must also match so the font coverage contract cannot drift without rebuilding.</lang>
        corpus_record = face_record["corpus"]
        for path_key, hash_key in (("rolePath", "roleSha256"), ("sharedPath", "sharedSha256")):
            if sha256_file(PROJECT_ROOT / corpus_record[path_key]) != corpus_record[hash_key]:
                raise RuntimeError(f"Corpus hash mismatch for {font_spec['id']}.")


def parse_arguments() -> argparse.Namespace:
    """
    <lang xml:lang="zh-CN">解析两个互斥语义明确的维护标志，不接受路径、URL 或任意命令。</lang>
    <lang xml:lang="en">Parses two maintenance flags with explicit semantics and accepts no path, URL, or arbitrary command.</lang>
    """
    # <lang xml:lang="zh-CN">CLI 仅切换网络与只读模式；所有输入输出边界仍由源码冻结。</lang>
    # <lang xml:lang="en">The CLI toggles network and read-only modes only; source code still freezes every input/output boundary.</lang>
    parser = argparse.ArgumentParser(description="Build or verify deterministic BP font subsets.")
    parser.add_argument("--offline", action="store_true", help="Use the verified local upstream cache only.")
    parser.add_argument("--verify-only", action="store_true", help="Verify checked-in outputs without downloading or writing.")
    return parser.parse_args()


def main() -> None:
    """
    <lang xml:lang="zh-CN">先锁定工具链，再选择只读验证或生成后复核；异常保留非零进程退出码。</lang>
    <lang xml:lang="en">Locks the toolchain first, then selects read-only verification or generation followed by verification; exceptions retain a nonzero process exit code.</lang>
    """
    # <lang xml:lang="zh-CN">版本门禁在读取 manifest 前执行，使审计结果明确属于声明的生成器版本。</lang>
    # <lang xml:lang="en">Run the version gate before reading the manifest so audit results clearly belong to the declared generator version.</lang>
    verify_toolchain()
    arguments = parse_arguments()

    if arguments.verify_only:
        verify_generated_artifacts()
        print("Verified 3 deterministic BP font subsets.")
        return

    # <lang xml:lang="zh-CN">生成后立即走同一只读路径，防止 manifest 或二进制只在构造期间通过局部检查。</lang>
    # <lang xml:lang="en">Immediately run the same read-only path after generation so neither manifest nor binary passes only partial construction-time checks.</lang>
    generate_fonts(arguments.offline)
    verify_generated_artifacts()
    print("Generated and verified 3 deterministic BP font subsets.")


# <lang xml:lang="zh-CN">仅作为直接维护命令执行；导入模块不会下载、写文件或运行生成。</lang>
# <lang xml:lang="en">Execute only as a direct maintenance command; importing the module never downloads, writes, or runs generation.</lang>
if __name__ == "__main__":
    main()
