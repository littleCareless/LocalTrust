<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCAInfo } from '../api/ca'
import { downloadCA } from '../api/ca'
import { ElMessage } from 'element-plus'
import { Download, InfoFilled } from '@element-plus/icons-vue'
import type { CAInfo } from '../types'

// 状态
const loading = ref(false)
const caInfo = ref<CAInfo | null>(null)

// 加载 CA 信息
const loadCAInfo = async () => {
  loading.value = true
  try {
    caInfo.value = await getCAInfo()
  } catch (error) {
    console.error('加载 CA 信息失败:', error)
  } finally {
    loading.value = false
  }
}

// 下载 CA 证书
const handleDownload = () => {
  if (!caInfo.value) {
    ElMessage.warning('CA 证书尚未生成，请先在系统中生成 CA 证书')
    return
  }
  downloadCA()
  ElMessage.success('开始下载 CA 证书')
}

onMounted(() => {
  loadCAInfo()
})
</script>

<template>
  <div class="help" v-loading="loading">
    <!-- CA 证书信息 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>CA 证书信息</span>
        </div>
      </template>

      <div v-if="caInfo">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="通用名称">
            {{ caInfo.commonName }}
          </el-descriptions-item>
          <el-descriptions-item label="组织">
            {{ caInfo.organization }}
          </el-descriptions-item>
          <el-descriptions-item label="序列号">
            {{ caInfo.serialNumber }}
          </el-descriptions-item>
          <el-descriptions-item label="指纹">
            {{ caInfo.fingerprint }}
          </el-descriptions-item>
          <el-descriptions-item label="有效期起">
            {{ new Date(caInfo.validFrom).toLocaleString('zh-CN') }}
          </el-descriptions-item>
          <el-descriptions-item label="有效期止">
            {{ new Date(caInfo.validTo).toLocaleString('zh-CN') }}
          </el-descriptions-item>
        </el-descriptions>

        <el-button type="primary" :icon="Download" style="margin-top: 20px" @click="handleDownload">
          下载根证书
        </el-button>
      </div>

      <el-empty v-else description="CA 证书尚未生成" />
    </el-card>

    <!-- 安装步骤 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>安装指南</span>
        </div>
      </template>

      <el-steps :active="0" direction="vertical">
        <el-step title="步骤 1：下载根证书" status="process">
          <template #description>
            <p>点击上方的"下载根证书"按钮，将 CA 证书保存到本地。</p>
          </template>
        </el-step>

        <el-step title="步骤 2：安装根证书" status="wait">
          <template #description>
            <el-collapse accordion>
              <el-collapse-item title="Windows 系统" name="windows">
                <ol>
                  <li>双击下载的证书文件（localtrust-ca.crt）</li>
                  <li>点击"安装证书"按钮</li>
                  <li>选择"本地计算机"，点击"下一步"</li>
                  <li>选择"将所有的证书都放入下列存储"</li>
                  <li>点击"浏览"，选择"受信任的根证书颁发机构"</li>
                  <li>点击"下一步"，然后点击"完成"</li>
                  <li>在安全警告对话框中点击"是"</li>
                </ol>
              </el-collapse-item>

              <el-collapse-item title="macOS 系统" name="macos">
                <ol>
                  <li>双击下载的证书文件（localtrust-ca.crt）</li>
                  <li>在"钥匙串访问"应用中，证书会被添加到"登录"钥匙串</li>
                  <li>找到刚添加的证书（LocalTrust Root CA）</li>
                  <li>双击证书，展开"信任"部分</li>
                  <li>将"使用此证书时"设置为"始终信任"</li>
                  <li>关闭窗口，输入系统密码确认</li>
                </ol>
              </el-collapse-item>

              <el-collapse-item title="Linux 系统" name="linux">
                <p><strong>Ubuntu/Debian:</strong></p>
                <pre><code>sudo cp localtrust-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates</code></pre>

                <p style="margin-top: 15px"><strong>CentOS/RHEL:</strong></p>
                <pre><code>sudo cp localtrust-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust</code></pre>

                <p style="margin-top: 15px"><strong>Firefox 浏览器（所有系统）:</strong></p>
                <ol>
                  <li>打开 Firefox，进入"设置" → "隐私与安全"</li>
                  <li>滚动到"证书"部分，点击"查看证书"</li>
                  <li>切换到"证书颁发机构"标签</li>
                  <li>点击"导入"，选择证书文件</li>
                  <li>勾选"信任此 CA 以标识网站"</li>
                  <li>点击"确定"</li>
                </ol>
              </el-collapse-item>
            </el-collapse>
          </template>
        </el-step>

        <el-step title="步骤 3：配置 DNS" status="wait">
          <template #description>
            <p>将系统 DNS 设置为 LocalTrust 服务器的 IP 地址。</p>

            <el-alert :icon="InfoFilled" type="info" :closable="false" style="margin-top: 10px">
              <p><strong>DNS 服务器地址：</strong>127.0.0.1（本机）或服务器 IP</p>
            </el-alert>

            <el-collapse accordion style="margin-top: 15px">
              <el-collapse-item title="Windows 系统" name="windows-dns">
                <ol>
                  <li>打开"控制面板" → "网络和 Internet" → "网络和共享中心"</li>
                  <li>点击当前连接的网络</li>
                  <li>点击"属性"按钮</li>
                  <li>选择"Internet 协议版本 4 (TCP/IPv4)"，点击"属性"</li>
                  <li>选择"使用下面的 DNS 服务器地址"</li>
                  <li>在"首选 DNS 服务器"中输入 LocalTrust 服务</li>
                  <li>点击"确定"保存设置</li>
                </ol>
              </el-collapse-item>

              <el-collapse-item title="macOS 系统" name="macos-dns">
                <ol>
                  <li>打开"系统偏好设置" → "网络"</li>
                  <li>选择当前使用的网络连接</li>
                  <li>点击"高级"按钮</li>
                  <li>切换到"DNS"标签</li>
                  <li>点击"+"按钮，添加 LocalTrust 服务器 IP</li>
                  <li>点击"好"，然后点击"应用"</li>
                </ol>
              </el-collapse-item>

              <el-collapse-item title="Linux 系统" name="linux-dns">
                <p><strong>使用 NetworkManager:</strong></p>
                <ol>
                  <li>右键点击网络图标，选择"编辑连接"</li>
                  <li>选择当前连接，点击"编辑"</li>
                  <li>切换到"IPv4 设置"标签</li>
                  <li>在"DNS 服务器"中添加 LocalTrust 服务器 IP</li>
                  <li>点击"保存"</li>
                </ol>

                <p style="margin-top: 15px"><strong>手动编辑 /etc/resolv.conf:</strong></p>
                <pre>
                  <code>sudo nano /etc/resolv.conf
# 添加以下行
nameserver 127.0.0.1</code>
</pre>
              </el-collapse-item>
            </el-collapse>
          </template>
        </el-step>

        <el-step title="步骤 4：验证配置" status="wait">
          <template #description>
            <p>完成上述步骤后，可以通过以下方式验证配置是否成功：</p>
            <ol>
              <li>在浏览器中访问已配置的域名（如 https://example.local）</li>
              <li>检查浏览器地址栏是否显示安全锁图标</li>
              <li>点击锁图标，查看证书信息，确认由 LocalTrust 签发</li>
            </ol>

            <el-alert type="success" :closable="false" style="margin-top: 10px">
              <p><strong>测试命令：</strong></p>
              <pre><code># 测试 DNS 解析
nslookup example.local

# 测试 HTTPS 连接
curl -v https://example.local</code></pre>
            </el-alert>
          </template>
        </el-step>
      </el-steps>
    </el-card>

    <!-- 常见问题 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>常见问题</span>
        </div>
      </template>

      <el-collapse accordion>
        <el-collapse-item title="为什么需要安装根证书？" name="q1">
          <p>
            LocalTrust 使用自签名证书为内部域名提供 HTTPS 支持。
            浏览器默认不信任自签名证书，因此需要将 LocalTrust 的根 CA 证书
            安装到系统的受信任证书列表中，这样浏览器才会信任由该 CA 签发的所有证书。
          </p>
        </el-collapse-item>

        <el-collapse-item title="证书安装后仍然提示不安全？" name="q2">
          <p>可能的原因：</p>
          <ul>
            <li>证书未正确安装到"受信任的根证书颁发机构"</li>
            <li>浏览器缓存问题，尝试清除浏览器缓存或重启浏览器</li>
            <li>Firefox 使用独立的证书存储，需要单独导入证书</li>
            <li>域名与证书不匹配，检查域名配置是否正确</li>
          </ul>
        </el-collapse-item>

        <el-collapse-item title="如何在移动设备上使用？" name="q3">
          <p>移动设备（iOS/Android）也需要安装根证书。可以通过以下方式：</p>
          <ol>
            <li>将证书文件传输到移动设备（邮件、云盘等）</li>
            <li>在移动设备上打开证书文件</li>
            <li>按照系统提示完成证书安装</li>
            <li>在设备的 Wi-Fi 设置中配置 DNS 服务器</li>
          </ol>
        </el-collapse-item>

        <el-collapse-item title="DNS 配置不生效？" name="q4">
          <p>请检查：</p>
          <ul>
            <li>DNS 服务器地址是否正确</li>
            <li>LocalTrust 服务是否正在运行</li>
            <li>防火墙是否阻止了 DNS 端口（53）</li>
            <li>
              尝试刷新 DNS 缓存：
              <ul>
                <li>Windows: <code>ipconfig /flushdns</code></li>
                <li>macOS: <code>sudo dscacheutil -flushcache</code></li>
                <li>Linux: <code>sudo systemd-resolve --flush-caches</code></li>
              </ul>
            </li>
          </ul>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<style scoped>
.help {
  width: 100%;
}

.card-header {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-step__description) {
  padding-right: 20px;
}

:deep(.el-collapse-item__content) {
  padding: 15px 20px;
}

ol,
ul {
  margin: 10px 0;
  padding-left: 25px;
}

li {
  margin: 8px 0;
  line-height: 1.6;
}

pre {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 10px 0;
}

code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  color: #e96900;
}

pre code {
  color: #303133;
}

p {
  line-height: 1.8;
  margin: 10px 0;
}

strong {
  font-weight: 600;
  color: #303133;
}
</style>
