/* LATTICE · glb3d.js — 本地 three.js 查看器（离线、零 CDN）
 * 依赖全局 THREE（assets/js/vendor/three.min.js）+ THREE.GLTFLoader（vendor/GLTFLoader.js）
 * 提供 MR.glb3d.mount(container, glbUrl, opts) 渲染可旋转 GLB。
 * 设计：纯手写 orbit（拖拽旋转 + 滚轮缩放 + 空闲自动旋转），不引入 OrbitControls。
 * 仅在「本地服务器」(http/https) 下可加载 GLB；file:// 下浏览器禁止 fetch 本地文件，会优雅回退。
 */
window.MR = window.MR || {};
MR.glb3d = (function () {
  function isWebGLAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function mount(container, glbUrl, opts) {
    opts = opts || {};
    var THREE = window.THREE;
    if (!THREE) { container.innerHTML = '<div class="glb3d__msg">3D 查看器未加载（缺少 three.js）</div>'; return; }
    if (!THREE.GLTFLoader) { container.innerHTML = '<div class="glb3d__msg">3D 查看器未加载（缺少 GLTFLoader）</div>'; return; }
    if (!isWebGLAvailable()) {
      container.innerHTML = '<div class="glb3d__msg">当前浏览器不支持 WebGL，已保留下方 SVG 示意。</div>';
      return;
    }
    var H = opts.height || 360;
    var W = container.clientWidth || container.offsetWidth || 520;
    var bg = opts.bg || '#F6F7F8';

    container.innerHTML = '';
    container.classList.add('glb3d');

    var loading = document.createElement('div');
    loading.className = 'glb3d__loading';
    loading.textContent = '正在加载 3D 模型…';
    container.appendChild(loading);

    if (opts.badge) {
      var badge = document.createElement('div');
      badge.className = 'glb3d__badge';
      badge.textContent = opts.badge;
      container.appendChild(badge);
    }

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.className = 'glb3d__canvas';
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var hemi = new THREE.HemisphereLight(0xffffff, 0x9aa1a8, 0.7);
    scene.add(hemi);
    var dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    var dir2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dir2.position.set(-4, 2, -3);
    scene.add(dir2);

    // 轨道参数
    var target = new THREE.Vector3(0, 0, 0);
    var radius = 4, theta = Math.PI * 0.25, phi = Math.PI * 0.36;
    var autoRotate = true, dragging = false, lastX = 0, lastY = 0;

    function updateCamera() {
      phi = Math.max(0.12, Math.min(Math.PI - 0.12, phi));
      radius = Math.max(0.5, Math.min(60, radius));
      var sp = Math.sin(phi);
      camera.position.set(
        target.x + radius * sp * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * sp * Math.cos(theta)
      );
      camera.lookAt(target);
    }
    updateCamera();

    var clock = { raf: 0 };
    function animate() {
      clock.raf = requestAnimationFrame(animate);
      if (autoRotate && !dragging) theta += 0.006;
      updateCamera();
      renderer.render(scene, camera);
    }

    // 交互
    renderer.domElement.addEventListener('pointerdown', function (e) {
      dragging = true; autoRotate = false; lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.setPointerCapture && renderer.domElement.setPointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      theta -= dx * 0.01; phi -= dy * 0.01;
    });
    function endDrag() { dragging = false; }
    renderer.domElement.addEventListener('pointerup', endDrag);
    renderer.domElement.addEventListener('pointerleave', endDrag);
    renderer.domElement.addEventListener('wheel', function (e) {
      e.preventDefault(); radius *= (1 + (e.deltaY > 0 ? 0.08 : -0.08));
    }, { passive: false });
    // 双击恢复自动旋转
    renderer.domElement.addEventListener('dblclick', function () { autoRotate = true; });

    function fit(model) {
      var box = new THREE.Box3().setFromObject(model);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      model.position.sub(center); // 居中到原点
      var maxDim = Math.max(size.x, size.y, size.z) || 1;
      var fov = camera.fov * Math.PI / 180;
      radius = (maxDim / 2) / Math.tan(fov / 2) * 1.7;
      // 让 PBR 材质在无环境贴图时也能被光照亮，避免发黑
      model.traverse(function (o) {
        if (o.isMesh && o.material) {
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function (m) {
            if (m && m.isMeshStandardMaterial) { m.metalness = Math.min(m.metalness, 0.15); m.roughness = Math.max(m.roughness, 0.55); }
          });
        }
      });
    }

    var loader = new THREE.GLTFLoader();
    loader.load(glbUrl, function (gltf) {
      var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      if (!model) { showError('3D 模型内容为空'); return; }
      fit(model);
      scene.add(model);
      if (loading.parentNode) loading.parentNode.removeChild(loading);
      updateCamera();
      animate();
    }, function (xhr) {
      if (xhr.total) {
        var pct = Math.round((xhr.loaded / xhr.total) * 100);
        loading.textContent = '正在加载 3D 模型… ' + pct + '%';
      }
    }, function () {
      showError('无法加载 3D 模型。请通过本地服务器打开本页（例如：python -m http.server），file:// 直接打开会被浏览器禁止读取本地 .glb 文件。');
    });

    function showError(msg) {
      if (loading.parentNode) loading.parentNode.removeChild(loading);
      var m = document.createElement('div');
      m.className = 'glb3d__msg';
      m.textContent = msg;
      container.appendChild(m);
    }

    // 自适应宽度
    function onResize() {
      var nw = container.clientWidth || W; if (!nw) return;
      W = nw; camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    if (window.ResizeObserver) { try { new ResizeObserver(onResize).observe(container); } catch (e) {} }
    window.addEventListener('resize', onResize);
  }

  return { mount: mount, isWebGLAvailable: isWebGLAvailable };
})();
