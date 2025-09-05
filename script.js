// Gswaper — базовая логика

document.addEventListener('DOMContentLoaded', function() {

    // Создание ордера
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(orderForm);
            const order = {
                id: Date.now(),
                type: formData.get('type'),
                currency: formData.get('currency'),
                amount: parseFloat(formData.get('amount')),
                price: parseFloat(formData.get('price')),
                payment: formData.get('payment'),
                status: 'active',
                createdAt: new Date().toISOString()
            };

            // Получаем текущие ордера
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));

            alert('✅ Ордер создан! ID: ' + order.id);
            window.location.href = 'orders.html';
        });
    }

    // Отображение ордеров
    const ordersList = document.getElementById('orders-list');
    if (ordersList) {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        if (orders.length === 0) {
            ordersList.innerHTML = '<p>Нет активных ордеров.</p>';
        } else {
            ordersList.innerHTML = orders.map(order => `
                <div class="order-item">
                    <strong>${order.type === 'buy' ? 'Покупка' : 'Продажа'} ${order.amount} ${order.currency}</strong><br>
                    Цена: ${order.price} RUB за 1 ${order.currency}<br>
                    Способ: ${order.payment}<br>
                    <small>Создан: ${new Date(order.createdAt).toLocaleString()}</small>
                </div>
            `).join('');
        }
    }

    // Обновление профиля
    const activeOrdersEl = document.getElementById('active-orders');
    const completedDealsEl = document.getElementById('completed-deals');
    if (activeOrdersEl && completedDealsEl) {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        activeOrdersEl.textContent = orders.filter(o => o.status === 'active').length;
        completedDealsEl.textContent = orders.filter(o => o.status === 'completed').length;
    }

});
